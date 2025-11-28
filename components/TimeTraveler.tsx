import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface TimeTravelerProps {
    isActive: boolean;
    onToggle: (value: boolean) => void;
}

export default function TimeTraveler({ isActive, onToggle }: TimeTravelerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);

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
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Mode Voyage dans le temps</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Activer (Hier 10h)</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#1992A6" }}
                            thumbColor={isActive ? "#ffffff" : "#f4f3f4"}
                            onValueChange={onToggle}
                            value={isActive}
                        />
                    </View>
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
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
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
});
