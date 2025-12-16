// Composant pour gérer les appels API avec les cookies de la WebView
// Version isolée pour éviter les conflits
export const API_BOOKING_INJECTION = `
setTimeout(function() {
  if (window.apiBookingInitialized) return;
  window.apiBookingInitialized = true;
  
  console.log('[API] Initialisation du système API');

  window.apiBooking = {
    // Récupérer tous les cookies
    getAllCookies: function() {
      return document.cookie;
    },

    // Parser les cookies en objet
    parseCookies: function() {
      const cookies = {};
      document.cookie.split(';').forEach(function(cookie) {
        const parts = cookie.trim().split('=');
        if (parts[0] && parts[1]) {
          cookies[parts[0]] = parts[1];
        }
      });
      return cookies;
    },

    // Extraire l'userId depuis la page
    extractUserId: function() {
      try {
        // Chercher dans localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('user') || key.includes('User'))) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              if (data && (data.id || data.userId)) {
                return data.id || data.userId;
              }
            } catch (e) {}
          }
        }
        return null;
      } catch (error) {
        console.error('[API] Erreur extraction userId:', error);
        return null;
      }
    },

    // Faire un appel API aux réservations
    fetchBookings: function(date, time, userId, organizationId, serviceId) {
      organizationId = organizationId || 1;
      serviceId = serviceId || 2;
      
      console.log('[API] Appel booking:', date, time, userId);
      
      return fetch('https://monrestoco.centre-valdeloire.fr/api/v1/gateway/bookings?organizationId=1', {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          date: date,
          time: time,
          userId: userId,
          organizationId: organizationId,
          serviceId: serviceId,
          origin: 'WEB'
        })
      })
      .then(function(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function(data) {
        console.log('[API] Réponse:', data);
        localStorage.setItem('lastBookingResponse', JSON.stringify({
          data: data,
          timestamp: Date.now()
        }));
        return data;
      })
      .catch(function(error) {
        console.error('[API] Erreur:', error);
        return null;
      });
    }
  };

  console.log('[API] Système prêt');
  console.log('[API] UserId:', window.apiBooking.extractUserId());
}, 2000);
`;
