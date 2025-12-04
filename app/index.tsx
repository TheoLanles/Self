import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useColorScheme, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import TimeTraveler from '../components/TimeTraveler';
import { DARK_MODE_INJECTION } from '../components/auto-dark';
import * as QuickActions from 'expo-quick-actions';

export default function Index() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const webviewRef = useRef<WebView>(null);

  // Recharge le WebView quand on change le mode time travel
  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  }, [isTimeTravelActive]);

  // Configure les Quick Actions
  useEffect(() => {
    QuickActions.setItems([
      {
        title: 'Voyage dans le temps',
        subtitle: 'Activer le mode temporel',
        icon: 'time_travel_icon',
        id: 'time_travel',
        params: { href: '/' },
      },
    ]);
  }, []);

  // Gère les Quick Actions
  useEffect(() => {
    let isMounted = true;

    if (QuickActions.initial?.id === 'time_travel') {
      setIsTimeTravelActive(true);
    }

    const subscription = QuickActions.addListener((action: QuickActions.Action) => {
      if (isMounted && action.id === 'time_travel') {
        setIsTimeTravelActive(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Fonction de rafraîchissement sans cache
  const onRefresh = () => {
    setRefreshing(true);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        (function() {
          window.location.reload(true);
        })();
        true;
      `);
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: isDark ? '#252525' : '#fff' }]}>
      <View style={{ height: insets.top * 0.5, backgroundColor: isDark ? '#252525' : '#F8F9FB' }} />

      <TimeTraveler isActive={isTimeTravelActive} onToggle={setIsTimeTravelActive} />

      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1992A6"
            colors={['#1992A6']}
            progressBackgroundColor={isDark ? '#353535' : '#ffffff'}
          />
        }
      >
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://monrestoco.centre-valdeloire.fr/reservation/' }}
          style={[styles.webview, { backgroundColor: isDark ? '#252525' : '#ffffff' }]}
          sharedCookiesEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          javaScriptEnabled={true}
          injectedJavaScriptBeforeContentLoaded={
            isTimeTravelActive ? `
              (function() {
                const OriginalDate = Date;
                const MOCK_DATE = new OriginalDate();
                MOCK_DATE.setDate(MOCK_DATE.getDate() - 1);
                MOCK_DATE.setHours(10, 0, 0, 0);

                window.Date = new Proxy(OriginalDate, {
                  construct(target, args) {
                    if (args.length === 0) {
                      return new target(MOCK_DATE.getTime());
                    }
                    return new target(...args);
                  },
                  apply(target, thisArg, args) {
                    return new target(MOCK_DATE.getTime()).toString();
                  },
                  get(target, prop) {
                    if (prop === 'now') {
                      return () => MOCK_DATE.getTime();
                    }
                    return Reflect.get(target, prop);
                  }
                });
              })();
              true;
            ` : undefined
          }
          injectedJavaScript={`
            (function() {
              const style = document.createElement('style');
              style.innerHTML = \`
                #launcher,
                iframe[title="Nombre de messages non lus"],
                .fieldService-module--box--85ccc,
                .Footer-module--box--6b61b:has(a[href="/reservation/Menu/"]),
                .fieldService-module--fieldContainer--5858a {
                  display: none !important;
                }
              \`;
              document.head.appendChild(style);

              function hideMenu() {
                const menuLink = document.querySelector('a[href="/reservation/Menu/"]');
                if (menuLink) {
                  const menuSection = menuLink.closest('.Footer-module--box--6b61b');
                  if (menuSection) {
                    menuSection.style.display = 'none';
                  }
                }
              }

              function hideCafeteria() {
                const paragraphs = document.querySelectorAll('p');
                paragraphs.forEach(p => {
                  if (p.textContent.trim() === 'Cafétéria') {
                    const section = p.closest('section');
                    if (section) {
                      section.style.display = 'none';
                    }
                  }
                });
              }

              function runRemovals() {
                hideMenu();
                hideCafeteria();
              }

              runRemovals();
              const observer = new MutationObserver(runRemovals);
              observer.observe(document.body, { childList: true, subtree: true });
            })();
            ${isDark ? DARK_MODE_INJECTION : ''}
            true;
          `}
          renderLoading={() => (
            <View style={{
              flex: 55,
              backgroundColor: isDark ? '#252525' : '#ffffff',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <ActivityIndicator size="large" color="#1992A6" />
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});