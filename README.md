# Self

Self est une application mobile qui permet d'accéder facilement au portail de réservation "Mon Resto Co".

## Fonctionnalités

*   **Accès direct** : Affiche le site de réservation dans une interface adaptée aux mobiles.
*   **Connexion persistante** : L'application garde votre session active pour ne pas avoir à se reconnecter à chaque fois.
*   **Interface épurée** : Masque automatiquement les éléments inutiles comme le widget de chat et certains liens de menu pour une meilleure lisibilité.
*   **Mode Voyage dans le temps** : En secouant l'appareil, vous pouvez activer un mode qui simule la date d'hier à 10h00.

## Fonctionnement détaillé

### WebView et Cookies
L'application utilise un composant `WebView` pour charger le site de réservation. L'option `sharedCookiesEnabled` est activée, ce qui permet de partager les cookies entre les sessions de l'application. Cela signifie que si vous vous connectez une fois, vous resterez connecté lors des prochaines ouvertures de l'application.

### Nettoyage de l'interface
Pour rendre l'expérience plus fluide sur mobile, du code JavaScript est injecté dans la page web (`injectedJavaScript`). Ce script :
1.  Crée une balise `<style>` pour masquer via CSS le widget de chat (`#launcher`) et certains éléments du pied de page.
2.  Utilise un `MutationObserver` pour surveiller les changements dans la page et masquer dynamiquement le lien "Menu" s'il réapparaît.

### Mode Voyage dans le temps
Ce mode est activé via le composant `TimeTraveler`.
*   **Activation** : Détecte le mouvement de secousse (shake) de l'appareil via `expo-sensors`.
*   **Effet** : Lorsque le mode est actif, un script est injecté avant le chargement du contenu (`injectedJavaScriptBeforeContentLoaded`). Ce script remplace l'objet `Date` global du navigateur par un `Proxy`.
*   **Simulation** : Ce proxy intercepte toutes les demandes de date et renvoie systématiquement "hier à 10h00".
## Installation et lancement

1.  Installez les dépendances :
    ```bash
    npm install
    ```

2.  Lancez l'application :
    ```bash
    npx expo start
    ```

3.  Scannez le QR code avec votre téléphone (via Expo Go) ou lancez sur un émulateur.
