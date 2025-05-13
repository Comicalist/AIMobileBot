import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Button,
  Alert,
} from 'react-native';
import { OPENAI_API_KEY } from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'bot', text: 'Hi! Ask me anything.' },
  ]);
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadLanguageSetting = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('preferredLanguage');
        if (savedLang) {
          setSelectedLanguage(savedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLanguageSetting();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      const saved = await AsyncStorage.getItem('conversations');
      if (saved) {
        setConversations(JSON.parse(saved));
      }
    };
    loadConversations();
  }, []);

  const updateConversation = async (updatedMessages) => {
    const updated = {
      id: currentConversationId || Date.now().toString(),
      title: `Conversation ${new Date().toLocaleString()}`,
      messages: updatedMessages,
    };

    const filtered = conversations.filter(c => c.id !== updated.id);
    const newList = [...filtered, updated];
    setConversations(newList);
    await AsyncStorage.setItem('conversations', JSON.stringify(newList));
    setCurrentConversationId(updated.id);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    let messageWithLanguage = input;

    if (selectedLanguage === 'Drunken Pirate') {
      messageWithLanguage += ' Respond like a drunken pirate, ye scurvy dog!';
    } else if (selectedLanguage) {
      messageWithLanguage += ` Respond to this in ${selectedLanguage}`;
    }

    const userMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: messageWithLanguage }],
        }),
      });

      const data = await response.json();
      const botReply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I didn’t get that.';

      const botMessage = { id: Date.now().toString() + '-bot', sender: 'bot', text: botReply };
      const updatedMessages = [...messages, userMessage, botMessage];
      setMessages(updatedMessages);
      await updateConversation(updatedMessages);

    } catch (err) {
      console.error(err);
      const errorMessage = {
        id: Date.now().toString() + '-bot',
        sender: 'bot',
        text: 'Oops, something went wrong.',
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      await updateConversation(updatedMessages);
    }
  };

  const startNewConversation = () => {
    const newId = Date.now().toString();
    setCurrentConversationId(newId);
    setMessages([{ id: '1', sender: 'bot', text: 'Hi! Ask me anything.' }]);
  };

  const loadConversation = (id) => {
    const convo = conversations.find(c => c.id === id);
    if (convo) {
      setCurrentConversationId(convo.id);
      setMessages(convo.messages);
      setIsSettingsVisible(false);
    }
  };

  const deleteConversation = async (id) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const filtered = conversations.filter(c => c.id !== id);
            setConversations(filtered);
            await AsyncStorage.setItem('conversations', JSON.stringify(filtered));

            if (id === currentConversationId) {
              setCurrentConversationId(null);
              setMessages([{ id: '1', sender: 'bot', text: 'Hi! Ask me anything.' }]);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.message, item.sender === 'user' ? styles.user : styles.bot]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  const handleLanguageSelect = async (language) => {
    try {
      await AsyncStorage.setItem('preferredLanguage', language);
      setSelectedLanguage(language);
      setIsSettingsVisible(false);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const toggleSettings = () => {
    setIsSettingsVisible(prev => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 20 }]}>
          <Text style={styles.headerTitle}>MobileAI</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={startNewConversation} style={{ marginRight: 10 }}>
              <Ionicons name="add-circle-outline" size={28} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSettings}>
              <Ionicons name="settings-outline" size={28} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.chat, { paddingTop: 60 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input field and Send button */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Modal */}
        <Modal
          visible={isSettingsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettingsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose a language/style</Text>
              <Button title="Respond in Finnish" onPress={() => handleLanguageSelect('Finnish')} />
              <Button title="Respond in Swedish" onPress={() => handleLanguageSelect('Swedish')} />
              <Button title="Respond like a drunken pirate" onPress={() => handleLanguageSelect('Drunken Pirate')} />
              <Button
                title="Clear Language Preference"
                onPress={async () => {
                  await AsyncStorage.removeItem('preferredLanguage');
                  setSelectedLanguage('');
                  setIsSettingsVisible(false);
                }}
              />

              <Text style={{ fontWeight: 'bold', marginTop: 20 }}>Past conversations:</Text>
              <FlatList
                data={conversations}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => loadConversation(item.id)} style={{ flex: 1 }}>
                      <Text style={{ paddingVertical: 6 }}>{item.title}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteConversation(item.id)}>
                      <Ionicons name="trash" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                )}
              />


              <Button title="Close" onPress={() => setIsSettingsVisible(false)} />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  chat: { padding: 16 },
  message: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  user: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  bot: {
    backgroundColor: '#E2E2E2',
    alignSelf: 'flex-start',
  },
  messageText: { fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
