import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Divider, Input, message, Space } from 'antd';
import { ClearOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';

const { TextArea } = Input;

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Merhaba, ben satış danışmanınızım. Ürün risk analizi, fiyatlandırma, rekabet durumu, kârlılık ' +
    've müşteri yorumlarına göre iyileştirme konularında veritabanındaki ürünleri kullanarak öneriler ' +
    'sunabilirim. Hangi ürünü satmayı düşünüyorsunuz?',
};

const EXAMPLE_QUESTIONS = [
  'Samsung klima satmayı düşünüyorum, ne önerirsin?',
  'Hangi kulaklık modellerinde kâr marjı daha yüksek?',
  'Oyun bilgisayarı satarken rakiplerimden nasıl ayrışırım?',
  'Müşteri yorumlarına göre telefonlarda nelere dikkat etmeliyim?',
  'Stok yönetimi için hangi ürünlere odaklanmalıyım?',
];

const ChatMessage = ({ role, content }) => (
  <div className={`chat-message ${role}`}>
    <div className="chat-message-row">
      <Avatar
        icon={role === 'user' ? <UserOutlined /> : <RobotOutlined />}
        style={{ backgroundColor: role === 'user' ? '#1890ff' : '#52c41a', flexShrink: 0 }}
      />
      <div className="chat-message-content">{content}</div>
    </div>
  </div>
);

const AIAssistant = () => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = currentMessage.trim();
    if (!text) {
      message.warning('Lütfen bir mesaj yazın');
      return;
    }

    setCurrentMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const response = await apiService.chatWithAI(text);
      const { response: answer, context_products: contextProducts } = response.data.data;
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      if (contextProducts > 0) {
        message.info(`Yanıt ${contextProducts} ilgili ürünün verisi kullanılarak oluşturuldu`);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Yanıt oluşturulamadı: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    message.info('Sohbet geçmişi temizlendi');
  };

  return (
    <Card
      title="AI Satış Danışmanı"
      extra={<Button icon={<ClearOutlined />} onClick={clearChat} type="text">Temizle</Button>}
    >
      <p>
        Sorularınız, veritabanındaki en ilgili ürünler bulunarak bu ürünlerin verileriyle birlikte
        yapay zekaya iletilir. Böylece yanıtlar genel tavsiyeler yerine gerçek ürün verisine dayanır.
      </p>

      <div className="chat-container">
        {messages.map((item, index) => (
          <ChatMessage key={index} role={item.role} content={item.content} />
        ))}
        {loading && <ChatMessage role="assistant" content="Yanıt hazırlanıyor..." />}
        <div ref={messagesEndRef} />
      </div>

      <Space.Compact style={{ width: '100%', marginTop: 16 }}>
        <TextArea
          value={currentMessage}
          onChange={(event) => setCurrentMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Sorunuzu yazın (Enter ile gönder, Shift+Enter ile yeni satır)"
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={loading}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={loading}
          style={{ height: 'auto' }}>
          Gönder
        </Button>
      </Space.Compact>

      <Divider />

      <h4>Örnek Sorular</h4>
      <Space wrap>
        {EXAMPLE_QUESTIONS.map((question) => (
          <Button key={question} size="small" onClick={() => setCurrentMessage(question)} disabled={loading}>
            {question}
          </Button>
        ))}
      </Space>
    </Card>
  );
};

export default AIAssistant;
