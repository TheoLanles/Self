import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useColorScheme, ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TimeTraveler from '../components/TimeTraveler';
import { DARK_MODE_INJECTION } from '../components/auto-dark';
import * as QuickActions from 'expo-quick-actions';

const CREDENTIALS_KEY = '@cas_credentials';
const LAST_CACHE_CLEAR_KEY = '@last_cache_clear';

export default function Index() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savedCredentials, setSavedCredentials] = useState<{ username: string, password: string } | null>(null);
  const [isCamouflaged, setIsCamouflaged] = useState(true); // Default to true to hide initial load
  const webviewRef = useRef<WebView>(null);

  // Charger les credentials sauvegardés
  useEffect(() => {
    loadCredentials();
    checkAndClearCache();
  }, []);

  // Vérifier et vider le cache à 14h tous les jours
  const checkAndClearCache = async () => {
    try {
      const now = new Date();
      const lastClearStr = await AsyncStorage.getItem(LAST_CACHE_CLEAR_KEY);

      let shouldClear = false;

      if (!lastClearStr) {
        // Première fois, on vide le cache
        shouldClear = true;
      } else {
        const lastClear = new Date(lastClearStr);
        const todayAt14 = new Date();
        todayAt14.setHours(14, 0, 0, 0);

        // Si on est après 14h aujourd'hui et que le dernier clear était avant 14h aujourd'hui
        if (now >= todayAt14 && lastClear < todayAt14) {
          shouldClear = true;
        }
      }

      if (shouldClear) {
        console.log('[Cache] Vidage du cache à 14h');
        // Sauvegarder la date du clear
        await AsyncStorage.setItem(LAST_CACHE_CLEAR_KEY, now.toISOString());
        // Recharger le WebView pour vider le cache
        if (webviewRef.current) {
          webviewRef.current.reload();
        }
      }
    } catch (error) {
      console.error('[Cache] Erreur lors de la vérification du cache:', error);
    }
  };

  // Vérifier le cache toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndClearCache();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadCredentials = async () => {
    try {
      const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        const creds = JSON.parse(stored);
        setSavedCredentials(creds);
        setIsCamouflaged(true); // Activer le camouflage si on a des credentials
      } else {
        setSavedCredentials(null);
        setIsCamouflaged(false); // Pas de camouflage si pas de credentials
        setShowLoginModal(true); // Afficher la config
      }
    } catch (error) {
      console.error('Erreur chargement credentials:', error);
      setIsCamouflaged(false);
      setShowLoginModal(true);
    }
  };

  const saveCredentials = async () => {
    try {
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ username, password }));
      setSavedCredentials({ username, password });
      setIsCamouflaged(true); // Activer le camouflage immédiatement
      setShowLoginModal(false);

      // Petit délai pour laisser le temps à React de mettre à jour la prop injectedJavaScript
      // avant de recharger la WebView
      setTimeout(() => {
        if (webviewRef.current) {
          webviewRef.current.reload();
        }
      }, 100);
    } catch (error) {
      console.error('Erreur sauvegarde credentials:', error);
    }
  };

  const clearCredentials = async () => {
    try {
      await AsyncStorage.removeItem(CREDENTIALS_KEY);
      setSavedCredentials(null);
      setUsername('');
      setPassword('');
      setIsCamouflaged(false);
      setShowLoginModal(true);
    } catch (error) {
      console.error('Erreur suppression credentials:', error);
    }
  };

  // Script d'auto-login CAS amélioré avec retry et timeouts adaptatifs
  const autoLoginScript = savedCredentials ? `
    (function() {
      // Configuration
      const MAX_RETRIES = 10;
      const INITIAL_DELAY = 500;
      const MAX_DELAY = 3000;
      let retryCount = 0;
      let loginAttempted = false;
      let eleveButtonClicked = false;

      console.log('[AutoLogin] Script initialisé');

      // Fonction pour vérifier si un élément est vraiment visible et interactif
      function isElementReady(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && 
               rect.height > 0 && 
               style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      }

      // Fonction pour attendre qu'un élément soit prêt
      function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
          const startTime = Date.now();
          const checkElement = () => {
            const element = typeof selector === 'string' 
              ? document.querySelector(selector) 
              : selector;
            
            if (element && isElementReady(element)) {
              console.log('[AutoLogin] Élément trouvé et prêt:', selector);
              resolve(element);
            } else if (Date.now() - startTime > timeout) {
              console.log('[AutoLogin] Timeout pour:', selector);
              resolve(null);
            } else {
              setTimeout(checkElement, 100);
            }
          };
          checkElement();
        });
      }

      // Fonction principale d'auto-login avec retry
      async function attemptAutoLogin() {
        // Éviter les tentatives multiples
        if (loginAttempted) {
          return;
        }

        console.log('[AutoLogin] Tentative', retryCount + 1, '/', MAX_RETRIES);

        // 1. Gérer le bouton de profil "Élève" s'il existe
        if (!eleveButtonClicked) {
          const eleveButton = document.getElementById('bouton_eleve');
          if (eleveButton && isElementReady(eleveButton)) {
            console.log('[AutoLogin] Bouton Élève détecté - Click...');
            eleveButton.click();
            eleveButtonClicked = true;
            // Attendre que la page se mette à jour après le click
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 2. Chercher les champs de login
        const usernameField = await waitForElement('input[name="username"], input[id="username"], input[type="text"]');
        const passwordField = await waitForElement('input[name="password"], input[id="password"], input[type="password"]');
        const submitButton = await waitForElement('#bouton_valider') || 
                            await waitForElement('input[type="submit"], button[type="submit"]');

        if (usernameField && passwordField && submitButton) {
          console.log('[AutoLogin] Tous les éléments trouvés - Remplissage...');
          loginAttempted = true;

          // Remplir les champs
          usernameField.value = '${savedCredentials.username}';
          passwordField.value = '${savedCredentials.password}';
          
          // Déclencher les événements
          usernameField.dispatchEvent(new Event('input', { bubbles: true }));
          usernameField.dispatchEvent(new Event('change', { bubbles: true }));
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));

          console.log('[AutoLogin] Champs remplis - Attente avant soumission...');
          
          // Attendre un peu plus longtemps avant de soumettre
          await new Promise(resolve => setTimeout(resolve, 800));

          // Vérifier que les valeurs sont toujours là
          if (usernameField.value && passwordField.value) {
            console.log('[AutoLogin] Soumission du formulaire...');
            submitButton.click();

            // Surveiller le succès du login
            let redirectTimeout = setTimeout(() => {
              console.log('[AutoLogin] Redirection de sécurité...');
              if (window.location.href.includes('/reservation')) {
                console.log('[AutoLogin] Déjà sur la page de réservation');
              } else {
                window.location.href = 'https://monrestoco.centre-valdeloire.fr/reservation/';
              }
            }, 5000); // Augmenté à 5 secondes

            // Observer les changements d'URL pour détecter le succès
            const urlObserver = setInterval(() => {
              if (window.location.href.includes('/reservation')) {
                console.log('[AutoLogin] Login réussi - Sur la page de réservation');
                clearTimeout(redirectTimeout);
                clearInterval(urlObserver);
              }
            }, 500);

          } else {
            console.log('[AutoLogin] Erreur: Les champs sont vides après remplissage');
            loginAttempted = false;
          }

        } else {
          // Retry avec backoff exponentiel
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            const delay = Math.min(INITIAL_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
            console.log('[AutoLogin] Éléments non trouvés - Nouvelle tentative dans', delay, 'ms');
            setTimeout(attemptAutoLogin, delay);
          } else {
            console.log('[AutoLogin] Nombre maximum de tentatives atteint');
          }
        }
      }

      // Démarrer l'auto-login
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptAutoLogin);
      } else {
        attemptAutoLogin();
      }

      // Observer les changements DOM pour les pages qui se chargent dynamiquement
      const observer = new MutationObserver(() => {
        if (!loginAttempted && retryCount < MAX_RETRIES) {
          attemptAutoLogin();
        }
      });
      
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    })();
    true;
  ` : '';

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
  const onRefresh = async () => {
    setRefreshing(true);
    const webview = webviewRef.current;
    if (webview) {
      console.log('[Cache] Vidage forcé du cache via swipe refresh');

      // Vider le cache de la WebView
      webview.clearCache(true);

      // Attendre un peu avant de recharger
      await new Promise(resolve => setTimeout(resolve, 300));

      // Recharger la page
      webview.reload();

      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  // Sécurité : si le camouflage reste bloqué trop longtemps (ex: erreur de login), on l'enlève
  useEffect(() => {
    if (isCamouflaged) {
      const timer = setTimeout(() => {
        setIsCamouflaged(false);
      }, 30000); // 30 secondes max pour les connexions lentes
      return () => clearTimeout(timer);
    }
  }, [isCamouflaged]);

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
          source={{ uri: 'https://auth.recia.fr/cas/login?service=https%3A%2F%2Fauth.region-centre.ianord.fr%2F%3Furl%3DaHR0cHM6Ly9tb25yZXN0b2NvLmNlbnRyZS12YWxkZWxvaXJlLmZyL3Jlc2VydmF0aW9uL1Jlc2VydmF0aW9uLw%253D%253D%26url%3DaHR0cHM6Ly9tb25yZXN0b2NvLmNlbnRyZS12YWxkZWxvaXJlLmZyL3Jlc2VydmF0aW9uL1Jlc2VydmF0aW9uLw%253D%253D&idpId=parentEleveEN-IdP' }}
          style={[styles.webview, { backgroundColor: isDark ? '#252525' : '#ffffff' }]}
          sharedCookiesEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          javaScriptEnabled={true}
          onNavigationStateChange={(navState) => {
            // Si on arrive sur la page de réservation, on enlève le camouflage
            if (navState.url.includes('/reservation') && !navState.loading) {
              setIsCamouflaged(false);
            }
          }}
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
            ${autoLoginScript}
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

      {/* Camouflage View */}
      {isCamouflaged && savedCredentials && (
        <View style={styles.camouflageOverlay}>
          <ActivityIndicator size="large" color="#1992A6" />
          <Text style={styles.camouflageText}>Connexion en cours...</Text>
        </View>
      )}

      {/* Modal de configuration */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (savedCredentials) setShowLoginModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#353535' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
              Configuration Auto-Login CAS
            </Text>

            <TextInput
              style={[styles.input, {
                backgroundColor: isDark ? '#252525' : '#f5f5f5',
                color: isDark ? '#fff' : '#000'
              }]}
              placeholder="Identifiant"
              placeholderTextColor={isDark ? '#999' : '#666'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, {
                backgroundColor: isDark ? '#252525' : '#f5f5f5',
                color: isDark ? '#fff' : '#000'
              }]}
              placeholder="Mot de passe"
              placeholderTextColor={isDark ? '#999' : '#666'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.warningText, { color: isDark ? '#ff9999' : '#cc0000' }]}>
              ⚠️ Vos identifiants sont stockés localement sur votre appareil
            </Text>

            <View style={styles.modalButtons}>
              {savedCredentials && (
                <TouchableOpacity
                  onPress={() => setShowLoginModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  <Text style={styles.buttonText}>Annuler</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={saveCredentials}
                style={[styles.button, styles.saveButton]}
                disabled={!username || !password}
              >
                <Text style={styles.buttonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  credentialsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  credentialsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1992A6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  credentialsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  setupButton: {
    backgroundColor: '#1992A6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  warningText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: '#1992A6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camouflageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  camouflageText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});