import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Pressable } from 'react-native'
import React, { useEffect, useState } from 'react'
import { NavigationProp } from '@react-navigation/native'
import { FIREBASE_AUTH } from '../../FirebaseConfig'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { FIREBASE_DB } from '../../FirebaseConfig'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'

interface RouterProps {
    navigation: NavigationProp<any, any>;
}

interface Todo {
    id: string;
    title: string;
    completed: boolean;
    priority: 'alta' | 'media' | 'baja';
    dueDate: Timestamp;
    userId: string;
}

const List = ({ navigation }: RouterProps) => {
    const [todos, setTodos] = useState<Todo[]>([])
    const [newTodo, setNewTodo] = useState('')
    const [filter, setFilter] = useState<'todas' | 'completadas' | 'pendientes'>('todas')
    const [priority, setPriority] = useState<'alta' | 'media' | 'baja'>('media')
    const [dueDate, setDueDate] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editPriority, setEditPriority] = useState<'alta' | 'media' | 'baja'>('media')
    const [editDueDate, setEditDueDate] = useState(new Date())
    const [showEditDatePicker, setShowEditDatePicker] = useState(false)

    useEffect(() => {
        loadTodos()
    }, [])

    const loadTodos = async () => {
        const userId = FIREBASE_AUTH.currentUser?.uid
        if (!userId) return

        const q = query(
            collection(FIREBASE_DB, 'todos'),
            where('userId', '==', userId)
        )

        const querySnapshot = await getDocs(q)
        const loadedTodos: Todo[] = []
        querySnapshot.forEach((doc) => {
            loadedTodos.push({ id: doc.id, ...doc.data() } as Todo)
        })
        setTodos(loadedTodos.sort((a, b) => b.dueDate.toDate().getTime() - a.dueDate.toDate().getTime()))
    }

    const addTodo = async () => {
        if (newTodo.trim().length === 0) return

        const userId = FIREBASE_AUTH.currentUser?.uid
        if (!userId) return

        try {
            await addDoc(collection(FIREBASE_DB, 'todos'), {
                title: newTodo,
                completed: false,
                priority,
                dueDate: Timestamp.fromDate(dueDate),
                userId
            })
            setNewTodo('')
            loadTodos()
        } catch (error) {
            console.error('Error adding todo:', error)
        }
    }

    const toggleTodo = async (todo: Todo) => {
        try {
            const todoRef = doc(FIREBASE_DB, 'todos', todo.id)
            await updateDoc(todoRef, {
                completed: !todo.completed
            })
            loadTodos()
        } catch (error) {
            console.error('Error updating todo:', error)
        }
    }

    const deleteTodo = async (todoId: string) => {
        try {
            await deleteDoc(doc(FIREBASE_DB, 'todos', todoId))
            loadTodos()
        } catch (error) {
            console.error('Error deleting todo:', error)
        }
    }

    const openEditModal = (todo: Todo) => {
        setEditingTodo(todo)
        setEditTitle(todo.title)
        setEditPriority(todo.priority)
        setEditDueDate(todo.dueDate.toDate())
        setModalVisible(true)
    }

    const updateTodo = async () => {
        if (!editingTodo || editTitle.trim().length === 0) return

        try {
            const todoRef = doc(FIREBASE_DB, 'todos', editingTodo.id)
            await updateDoc(todoRef, {
                title: editTitle,
                priority: editPriority,
                dueDate: Timestamp.fromDate(editDueDate)
            })
            setModalVisible(false)
            loadTodos()
        } catch (error) {
            console.error('Error updating todo:', error)
        }
    }

    const filteredTodos = todos.filter(todo => {
        if (filter === 'completadas') return todo.completed
        if (filter === 'pendientes') return !todo.completed
        return true
    })

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'alta': return '#ff6b6b'
            case 'media': return '#ffd93d'
            case 'baja': return '#6bff6b'
            default: return '#000000'
        }
    }

    return (
        <View style={styles.container}>
            {/* Input Section */}
            <View style={styles.inputSection}>
                <TextInput
                    style={styles.input}
                    value={newTodo}
                    onChangeText={setNewTodo}
                    placeholder="Nueva tarea"
                    placeholderTextColor="#666"
                />
                <View style={styles.priorityContainer}>
                    {['baja', 'media', 'alta'].map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.priorityButton,
                                { backgroundColor: getPriorityColor(p) },
                                priority === p && styles.selectedPriority
                            ]}
                            onPress={() => setPriority(p as 'alta' | 'media' | 'baja')}
                        >
                            <Text style={styles.priorityText}>{p}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color="#fff" />
                    <Text style={styles.dateButtonText}>
                        {dueDate.toLocaleDateString()}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={dueDate}
                        mode="date"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false)
                            if (selectedDate) setDueDate(selectedDate)
                        }}
                    />
                )}

                <TouchableOpacity style={styles.addButton} onPress={addTodo}>
                    <Text style={styles.addButtonText}>Agregar tarea</Text>
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {['todas', 'completadas', 'pendientes'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterButton, filter === f && styles.selectedFilter]}
                        onPress={() => setFilter(f as 'todas' | 'completadas' | 'pendientes')}
                    >
                        <Text style={[styles.filterText, filter === f && styles.selectedFilterText]}>
                            {f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Todo List */}
            <FlatList
                data={filteredTodos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.todoItem}
                        onPress={() => openEditModal(item)}
                    >
                        <TouchableOpacity
                            style={styles.todoCheckbox}
                            onPress={() => toggleTodo(item)}
                        >
                            {item.completed && (
                                <Ionicons name="checkmark" size={18} color="#4CAF50" />
                            )}
                        </TouchableOpacity>
                        
                        <View style={styles.todoContent}>
                            <Text style={[
                                styles.todoTitle,
                                item.completed && styles.completedTodo
                            ]}>
                                {item.title}
                            </Text>
                            <View style={styles.todoDetails}>
                                <View style={[
                                    styles.priorityIndicator,
                                    { backgroundColor: getPriorityColor(item.priority) }
                                ]} />
                                <Text style={styles.todoDate}>
                                    {item.dueDate.toDate().toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            onPress={() => deleteTodo(item.id)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ff0000" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Tarea</Text>
                        
                        <TextInput
                            style={styles.modalInput}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholder="Título de la tarea"
                        />

                        <View style={styles.priorityContainer}>
                            {['baja', 'media', 'alta'].map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.priorityButton,
                                        { backgroundColor: getPriorityColor(p) },
                                        editPriority === p && styles.selectedPriority
                                    ]}
                                    onPress={() => setEditPriority(p as 'alta' | 'media' | 'baja')}
                                >
                                    <Text style={styles.priorityText}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={styles.dateButton}
                            onPress={() => setShowEditDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#fff" />
                            <Text style={styles.dateButtonText}>
                                {editDueDate.toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>

                        {showEditDatePicker && (
                            <DateTimePicker
                                value={editDueDate}
                                mode="date"
                                onChange={(event, selectedDate) => {
                                    setShowEditDatePicker(false)
                                    if (selectedDate) setEditDueDate(selectedDate)
                                }}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={updateTodo}
                            >
                                <Text style={styles.modalButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Logout Button */}
            <TouchableOpacity 
                style={styles.logoutButton}
                onPress={() => FIREBASE_AUTH.signOut()}
            >
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    inputSection: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    priorityButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        opacity: 0.6,
    },
    selectedPriority: {
        opacity: 1,
        transform: [{ scale: 1.1 }],
    },
    priorityText: {
        color: '#000',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    dateButton: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    dateButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterButton: {
        flex: 1,
        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    selectedFilter: {
        backgroundColor: '#2196F3',
    },
    filterText: {
        color: '#666',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    selectedFilterText: {
        color: '#fff',
    },
    // ... (continúa desde los estilos anteriores)
    
    todoItem: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    todoCheckbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    todoContent: {
        flex: 1,
    },
    todoTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    completedTodo: {
        textDecorationLine: 'line-through',
        color: '#888',
    },
    todoDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priorityIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    todoDate: {
        fontSize: 12,
        color: '#666',
    },
    deleteButton: {
        padding: 8,
    },
    
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#ff6b6b',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Logout Button
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff6b6b',
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default List;