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
} from 'react-native';
import { OPENAI_API_KEY } from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'bot', text: 'Hi! Ask me anything.' },
  ]);
  const [input, setInput] = useState('');
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

  const sendMessage = async () => {
    if (!input.trim()) return;

    let messageWithLanguage = input;

    if (selectedLanguage === 'Drunken Pirate') {
      messageWithLanguage += ' Respond like a drunken pirate, ye scurvy dog!';
    } else if (selectedLanguage) {
      messageWithLanguage += ` Respond to this in ${selectedLanguage}`;
    }

    console.log("User Message Sent: ", messageWithLanguage);

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
      console.log(data);
      const botReply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I didn’t get that.';

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '-bot', sender: 'bot', text: botReply },
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '-bot', sender: 'bot', text: 'Oops, something went wrong.' },
      ]);
    }
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
          <TouchableOpacity onPress={toggleSettings}>
            <Ionicons name="settings-outline" size={28} color="black" />
          </TouchableOpacity>
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
  chat: {
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  message: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E2E2',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ccc',
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  settingsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 10,
    width: 300,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
});
