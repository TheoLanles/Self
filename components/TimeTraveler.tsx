import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface TimeTravelerProps {
    isActive: boolean;
    onToggle: (value: boolean) => void;
    webviewRef?: React.RefObject<WebView>;
    bookingStatus?: { loading: boolean; message: string };
    onBookingStart?: () => void;
}

export default function TimeTraveler({ isActive, onToggle, webviewRef, bookingStatus, onBookingStart }: TimeTravelerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [weekSelectionVisible, setWeekSelectionVisible] = useState(false);
    const [weekLoading, setWeekLoading] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Utiliser le statut de booking du parent
    const bookingLoading = bookingStatus?.loading || false;
    const bookingMessage = bookingStatus?.message || '';

    // Gérer le toggle du time travel avec fermeture et refresh
    const handleToggle = (value: boolean) => {
        // Appeler le toggle du parent
        onToggle(value);

        // Fermer le modal
        setModalVisible(false);

        // Rafraîchir la page après un court délai
        setTimeout(() => {
            if (webviewRef?.current) {
                console.log('[TimeTraveler] Refresh après toggle...');
                webviewRef.current.reload();
            }
        }, 300);
    };

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

    // Calculer les 5 jours de la semaine à partir d'une date donnée
    const getWeekdaysFrom = (startDate: Date) => {
        const weekdays = [];
        const currentDay = startDate.getDay(); // 0=Dimanche, 1=Lundi, etc.

        // Calculer le lundi de cette semaine
        const monday = new Date(startDate);
        monday.setDate(startDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

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

        // Afficher le modal de sélection de semaine
        setWeekSelectionVisible(true);
    };

    // Fonction pour exécuter la réservation selon la semaine choisie
    const executeBooking = (weeksAhead: number) => {
        if (!webviewRef?.current) {
            return;
        }

        // Notifier le parent que le booking commence
        onBookingStart?.();

        // Calculer la date de début selon le nombre de semaines à l'avance
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (weeksAhead * 7));

        const weekdays = getWeekdaysFrom(startDate);

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

        // Activer le loading
        setWeekLoading(true);

        // Attendre la confirmation (3 secondes)
        setTimeout(() => {
            // Désactiver le loading
            setWeekLoading(false);

            // Fermer le modal de sélection de semaine
            setWeekSelectionVisible(false);

            // Fermer le modal principal après 300ms
            setTimeout(() => {
                setModalVisible(false);

                // Premier refresh après 500ms
                setTimeout(() => {
                    if (webviewRef.current) {
                        console.log('[Booking] Premier refresh...');
                        webviewRef.current.reload();

                        // Deuxième refresh après 500ms supplémentaires
                        setTimeout(() => {
                            if (webviewRef.current) {
                                console.log('[Booking] Deuxième refresh...');
                                webviewRef.current.reload();
                            }
                        }, 500);
                    }
                }, 500);
            }, 300);
        }, 3000);
    };

    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, []);

    return (
        <>
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
                                onValueChange={handleToggle}
                                value={isActive}
                            />
                        </View>

                        {/* Bouton de réservation hebdomadaire */}
                        <TouchableOpacity
                            style={[styles.button, styles.buttonBooking]}
                            onPress={handleWeeklyBooking}
                        >
                            <Text style={styles.textStyle}>Réserver la semaine</Text>
                        </TouchableOpacity>

                        {/* Séparateur */}
                        <View style={styles.separator} />

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

            {/* Modal de sélection de semaine */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={weekSelectionVisible}
                onRequestClose={() => setWeekSelectionVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={[styles.weekModalView, isDark && styles.modalViewDark]}>
                        <Text style={[styles.weekModalTitle, isDark && styles.textLight]}>Réservation</Text>
                        <Text style={[styles.weekModalSubtitle, isDark && styles.textLight]}>
                            Sélectionnez la semaine à réserver
                        </Text>

                        <View style={styles.weekButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.weekButton, styles.weekButtonCurrent, weekLoading && styles.buttonDisabled]}
                                onPress={() => executeBooking(0)}
                                disabled={weekLoading}
                            >
                                {weekLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="calendar" size={24} color="#fff" />
                                )}
                                <Text style={styles.weekButtonText}>Semaine actuelle</Text>
                                <Text style={styles.weekButtonSubtext}>Cette semaine</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.weekButton, styles.weekButton1, weekLoading && styles.buttonDisabled]}
                                onPress={() => executeBooking(1)}
                                disabled={weekLoading}
                            >
                                {weekLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="arrow-forward" size={24} color="#fff" />
                                )}
                                <Text style={styles.weekButtonText}>Semaine prochaine</Text>
                                <Text style={styles.weekButtonSubtext}>Dans 7 jours</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.weekButton, styles.weekButton2, weekLoading && styles.buttonDisabled]}
                                onPress={() => executeBooking(2)}
                                disabled={weekLoading}
                            >
                                {weekLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="play-forward" size={24} color="#fff" />
                                )}
                                <Text style={styles.weekButtonText}>Semaine +2</Text>
                                <Text style={styles.weekButtonSubtext}>Dans 14 jours</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, styles.weekCancelButton]}
                            onPress={() => setWeekSelectionVisible(false)}
                        >
                            <Text style={[styles.textStyle, { color: isDark ? '#fff' : '#667085' }]}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
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
    weekModalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '90%',
        maxWidth: 400,
    },
    weekModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1992A6',
        marginBottom: 8,
    },
    weekModalSubtitle: {
        fontSize: 14,
        color: '#667085',
        marginBottom: 24,
        textAlign: 'center',
    },
    weekButtonsContainer: {
        width: '100%',
        gap: 12,
    },
    weekButton: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    weekButtonCurrent: {
        backgroundColor: '#1992A6',
    },
    weekButton1: {
        backgroundColor: '#27AE60',
    },
    weekButton2: {
        backgroundColor: '#F39C12',
    },
    weekButtonEmoji: {
        fontSize: 24,
    },
    weekButtonText: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    weekButtonSubtext: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.8,
    },
    weekCancelButton: {
        backgroundColor: 'transparent',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#dfe0eb',
    },
});
