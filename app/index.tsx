import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import TimeTraveler from '../components/TimeTraveler';
import { DARK_MODE_INJECTION } from '../components/auto-dark';

export default function Index() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  }, [isTimeTravelActive]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: isDark ? '#252525' : '#fff' }]}>
      <View style={{ height: insets.top * 0.5, backgroundColor: isDark ? '#252525' : '#F8F9FB' }} />
      <TimeTraveler isActive={isTimeTravelActive} onToggle={setIsTimeTravelActive} />
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://monrestoco.centre-valdeloire.fr/reservation/' }}
        style={[styles.webview, { backgroundColor: isDark ? '#252525' : '#ffffff' }]}
        sharedCookiesEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        cacheEnabled={true}
        javaScriptEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        injectedJavaScriptBeforeContentLoaded={
          isTimeTravelActive ? `
            (function() {
              const OriginalDate = Date;
              const MOCK_DATE = new OriginalDate();
              MOCK_DATE.setDate(MOCK_DATE.getDate() - 1); // Yesterday
              MOCK_DATE.setHours(10, 0, 0, 0); // 10:00 AM

              // Create a proxy to handle Date construction and static methods
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
            // Chat Widget Removal
            const style = document.createElement('style');
            style.innerHTML = \`
              #launcher,
              iframe[title="Nombre de messages non lus"],
              .Footer-module--box--6b61b:has(a[href="/reservation/Menu/"]) {
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

            hideMenu();
            const observer = new MutationObserver(hideMenu);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
          ${isDark ? DARK_MODE_INJECTION : ''}
          true;
        `}
      />
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
