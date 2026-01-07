import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';
import { Subject } from '../../lib/types';

export default function SubjectManageScreen() {
    const router = useRouter();
    const { subjects, addSubject, updateSubject, deleteSubject } = useAppStore();
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Filter archived and sort by order
    const activeSubjects = subjects
        .filter(s => !s.isArchived)
        .sort((a, b) => a.order - b.order);

    const handleAdd = () => {
        const name = newSubjectName.trim();
        if (!name) return;
        if (name.length > 20) {
            Alert.alert('Error', 'Name must be 20 characters or less.');
            return;
        }
        if (activeSubjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            Alert.alert('Error', 'Subject name already exists.');
            return;
        }

        addSubject(name);
        setNewSubjectName('');
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Subject',
            'Are you sure you want to delete this subject? Past records will be kept.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteSubject(id),
                },
            ]
        );
    };

    const startEdit = (subject: Subject) => {
        setEditingId(subject.id);
        setEditName(subject.name);
    };

    const saveEdit = () => {
        if (!editingId) return;
        const name = editName.trim();
        if (!name) return;
        if (name.length > 20) {
            Alert.alert('Error', 'Name must be 20 characters or less.');
            return;
        }
        // Check duplicates (excluding self)
        if (activeSubjects.some(s => s.id !== editingId && s.name.toLowerCase() === name.toLowerCase())) {
            Alert.alert('Error', 'Subject name already exists.');
            return;
        }

        updateSubject(editingId, { name });
        setEditingId(null);
        setEditName('');
    };

    const moveSubject = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === activeSubjects.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentSubject = activeSubjects[index];
        const targetSubject = activeSubjects[targetIndex];

        // Swap orders
        updateSubject(currentSubject.id, { order: targetSubject.order });
        updateSubject(targetSubject.id, { order: currentSubject.order });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Subjects</Text>
                <TouchableOpacity onPress={() => setIsAdding(!isAdding)} style={styles.addButtonIcon}>
                    <Ionicons name={isAdding ? "close" : "add"} size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Add New Subject Input */}
            {isAdding && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="New Subject Name"
                        placeholderTextColor={COLORS.gray}
                        value={newSubjectName}
                        onChangeText={setNewSubjectName}
                        autoFocus
                    />
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* List */}
            <FlatList
                data={activeSubjects}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <View style={styles.card}>
                        {editingId === item.id ? (
                            <View style={styles.editContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    autoFocus
                                />
                                <TouchableOpacity onPress={saveEdit} style={styles.iconButton}>
                                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingId(null)} style={styles.iconButton}>
                                    <Ionicons name="close" size={20} color={COLORS.gray} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.cardContent}>
                                    <Text style={styles.subjectName}>{item.name}</Text>
                                </View>

                                <View style={styles.actions}>
                                    {/* Reorder Buttons */}
                                    <View style={styles.reorderContainer}>
                                        <TouchableOpacity
                                            onPress={() => moveSubject(index, 'up')}
                                            disabled={index === 0}
                                            style={[styles.iconButton, index === 0 && styles.disabledIcon]}
                                        >
                                            <Ionicons name="chevron-up" size={20} color={COLORS.gray} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => moveSubject(index, 'down')}
                                            disabled={index === activeSubjects.length - 1}
                                            style={[styles.iconButton, index === activeSubjects.length - 1 && styles.disabledIcon]}
                                        >
                                            <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity onPress={() => startEdit(item)} style={styles.iconButton}>
                                        <Ionicons name="pencil-outline" size={20} color={COLORS.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
                                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    addButtonIcon: {
        padding: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 12,
        color: COLORS.text,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    editContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
    },
    subjectName: {
        fontSize: 18,
        fontWeight: '500',
        color: COLORS.text,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reorderContainer: {
        flexDirection: 'column',
        marginRight: 8,
    },
    iconButton: {
        padding: 4,
    },
    disabledIcon: {
        opacity: 0.3,
    },
});
