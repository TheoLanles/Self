import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={{ height: insets.top * 0.5, backgroundColor: '#F8F9FB' }} />
      <WebView
        source={{ uri: 'https://monrestoco.centre-valdeloire.fr/reservation/' }}
        style={styles.webview}
        sharedCookiesEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        cacheEnabled={true}
        javaScriptEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        injectedJavaScript={`
          (function() {
            const style = document.createElement('style');
            style.innerHTML = \`
              #launcher,
              iframe[title="Nombre de messages non lus"] {
                display: none !important;
              }
            \`;
            document.head.appendChild(style);

            setInterval(() => {
              const menuLink = document.querySelector('a[href="/reservation/Menu/"]');
              if (menuLink) {
                const menuSection = menuLink.closest('.Footer-module--box--6b61b');
                if (menuSection) {
                  menuSection.style.display = 'none';
                }
              }
            }, 500);
          })();
          true;
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});
