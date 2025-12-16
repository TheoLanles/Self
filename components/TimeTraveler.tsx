import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View, useColorScheme, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface TimeTravelerProps {
    isActive: boolean;
    onToggle: (value: boolean) => void;
    webviewRef?: React.RefObject<WebView>;
    bookingStatus?: { loading: boolean; message: string };
    onBookingStart?: () => void;
}

export default function TimeTraveler({ isActive, onToggle, webviewRef, bookingStatus, onBookingStart }: TimeTravelerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Utiliser le statut de booking du parent
    const bookingLoading = bookingStatus?.loading || false;
    const bookingMessage = bookingStatus?.message || '';

    const _subscribe = () => {
        setSubscription(
            Accelerometer.addListener(accelerometerData => {
                const { x, y, z } = accelerometerData;
                const totalForce = Math.abs(x) + Math.abs(y) + Math.abs(z);
                if (totalForce > 3.5) { // Threshold for shake
                    setModalVisible(true);
                }
            })
        );
        Accelerometer.setUpdateInterval(100);
    };

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };

    // Calculer les 5 jours de la semaine (Lundi-Vendredi)
    const getWeekdays = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0=Dimanche, 1=Lundi, etc.
        const weekdays = [];

        // Calculer le lundi de la semaine actuelle
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

        // Ajouter les 5 jours de la semaine
        for (let i = 0; i < 5; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            weekdays.push(day.toISOString().split('T')[0]); // Format: YYYY-MM-DD
        }

        return weekdays;
    };

    // Fonction pour réserver toute la semaine
    const handleWeeklyBooking = () => {
        if (!webviewRef?.current) {
            return;
        }

        // Notifier le parent que le booking commence
        onBookingStart?.();

        const weekdays = getWeekdays();

        const script = `
            (async function() {
                try {
                    const weekdays = ${JSON.stringify(weekdays)};
                    
                    // Récupérer le userId depuis l'API profile
                    console.log('[Booking] Récupération du userId...');
                    const profileResponse = await fetch('https://monrestoco.centre-valdeloire.fr/api/v1/gateway/users/profile', {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'content-type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            authorizations: true,
                            userContactDetail: {
                                contactDetail: true
                            },
                            studentDetail: true,
                            children: {
                                authorizations: true,
                                userContactDetail: {
                                    contactDetail: true
                                }
                            }
                        })
                    });

                    if (!profileResponse.ok) {
                        throw new Error('Erreur lors de la récupération du profil');
                    }

                    const profileData = await profileResponse.json();
                    const userId = profileData.userId;
                    
                    if (!userId) {
                        throw new Error('UserId non trouvé dans le profil');
                    }

                    console.log('[Booking] UserId trouvé:', userId);
                    
                    const results = [];
                    
                    for (const date of weekdays) {
                        const result = await window.apiBooking.fetchBookings(
                            date,
                            "12:00",
                            userId,
                            1,
                            2
                        );
                        results.push({ date, success: !!result, data: result });
                        
                        // Petit délai entre les appels
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'weekly_booking_complete',
                        results: results
                    }));
                } catch (error) {
                    console.error('[Booking] Erreur:', error.message);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'weekly_booking_error',
                        message: error.message
                    }));
                }
            })();
            true;
        `;

        webviewRef.current.injectJavaScript(script);
    };

    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, []);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, isDark && styles.modalViewDark]}>
                    <Text style={[styles.modalText, isDark && styles.textLight]}>Mode Avancé</Text>
                    <View style={styles.row}>
                        <Text style={[styles.label, isDark && styles.textLight]}>Activer (Hier 10h)</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#1992A6" }}
                            thumbColor={isActive ? "#ffffff" : "#f4f3f4"}
                            onValueChange={onToggle}
                            value={isActive}
                        />
                    </View>

                    {/* Séparateur */}
                    <View style={styles.separator} />

                    {/* Bouton de réservation hebdomadaire */}
                    <TouchableOpacity
                        style={[styles.button, styles.buttonBooking, bookingLoading && styles.buttonDisabled]}
                        onPress={handleWeeklyBooking}
                        disabled={bookingLoading}
                    >
                        {bookingLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text style={[styles.textStyle, { marginLeft: 10 }]}>Réservation...</Text>
                            </View>
                        ) : (
                            <Text style={styles.textStyle}>Réserver la semaine</Text>
                        )}
                    </TouchableOpacity>

                    {/* Message de feedback */}
                    {bookingMessage ? (
                        <Text style={[styles.feedbackText, isDark && styles.textLight]}>{bookingMessage}</Text>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.textStyle}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
    },
    modalViewDark: {
        backgroundColor: '#252525',
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        marginTop: 15,
        minWidth: 100,
    },
    buttonClose: {
        backgroundColor: '#1992A6',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1992A6',
    },
    textLight: {
        color: '#fff',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
    },
    label: {
        color: '#667085',
        fontSize: 16,
        marginRight: 10,
        flex: 1,
    },
    separator: {
        width: '100%',
        height: 1,
        backgroundColor: '#dfe0eb',
        marginVertical: 15,
    },
    buttonBooking: {
        backgroundColor: '#27AE60',
        width: '100%',
    },
    buttonDisabled: {
        backgroundColor: '#95a5a6',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackText: {
        marginTop: 10,
        fontSize: 14,
        textAlign: 'center',
        color: '#667085',
    },
});
