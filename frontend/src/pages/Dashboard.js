import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, message, Progress, Row, Spin, Statistic, Table, Tag } from 'antd';
import { DatabaseOutlined, DollarOutlined, ShoppingOutlined, StarOutlined } from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiService } from '../services/api';
import { formatPrice, formatTableName } from '../utils/format';
import { getRiskScoreColor } from '../utils/risk';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E57373', '#4DB6AC'];

const formatNumber = (value) => Number(value || 0).toLocaleString('tr-TR');

const TABLE_COLUMNS = [
  { title: 'Kategori', dataIndex: 'name', key: 'name', render: (text) => <strong>{text}</strong> },
  { title: 'Toplam Ürün', dataIndex: 'total_products', key: 'total_products', render: formatNumber },
  { title: 'Embedding Sayısı', dataIndex: 'embeddings_count', key: 'embeddings_count', render: formatNumber },
  {
    title: 'Kapsama',
    dataIndex: 'embedding_coverage',
    key: 'embedding_coverage',
    render: (value) => (
      <Progress
        percent={Math.min(100, value)}
        size="small"
        status={value >= 100 ? 'success' : value > 50 ? 'active' : 'exception'}
      />
    ),
  },
  { title: 'Ort. Fiyat', dataIndex: 'avg_price', key: 'avg_price', render: formatPrice },
  {
    title: 'Ort. Puan',
    dataIndex: 'avg_rating',
    key: 'avg_rating',
    render: (value) => (value ? `${value.toFixed(1)} / 5` : '-'),
  },
];

const SALES_COLUMNS = [
  { title: 'Ürün Adı', dataIndex: 'product_name', key: 'product_name', render: (text) => <strong>{text}</strong> },
  { title: 'Marka', dataIndex: 'brand', key: 'brand', render: (text) => <Tag color="blue">{text}</Tag> },
  {
    title: 'Kategori',
    dataIndex: 'source_table',
    key: 'source_table',
    render: (text) => formatTableName(text),
  },
  {
    title: 'Fiyat',
    dataIndex: 'price',
    key: 'price',
    sorter: (a, b) => a.price - b.price,
    render: (value) => <span className="price-text">{formatPrice(value)}</span>,
  },
  {
    title: 'Puan',
    dataIndex: 'rating',
    key: 'rating',
    sorter: (a, b) => a.rating - b.rating,
    render: (value) => (
      <div>
        <span>{value ? `${value.toFixed(1)} / 5` : '-'}</span>
        <Progress percent={value * 20} size="small" showInfo={false} />
      </div>
    ),
  },
  {
    title: 'Risk Skoru',
    dataIndex: 'risk_score',
    key: 'risk_score',
    sorter: (a, b) => a.risk_score - b.risk_score,
    render: (value) => <Tag color={getRiskScoreColor(value)}>{value} / 10</Tag>,
  },
  { title: 'Satıcı', dataIndex: 'seller', key: 'seller' },
  { title: 'Stok Durumu', dataIndex: 'stock_status', key: 'stock_status' },
];

const summarize = (stats) => {
  const totalProducts = stats.reduce((sum, t) => sum + t.total_products, 0);
  const weighted = (field) =>
    totalProducts > 0 ? stats.reduce((sum, t) => sum + t[field] * t.total_products, 0) / totalProducts : 0;

  return {
    totalProducts,
    totalEmbeddings: stats.reduce((sum, t) => sum + t.embeddings_count, 0),
    avgPrice: weighted('avg_price'),
    avgRating: weighted('avg_rating'),
  };
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    Promise.allSettled([apiService.getTableStats(), apiService.getSalesData()])
      .then(([statsResult, salesResult]) => {
        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value.data.data);
        } else {
          message.error(`Kategori istatistikleri yüklenemedi: ${statsResult.reason.message}`);
        }
        if (salesResult.status === 'fulfilled') {
          setSalesData(salesResult.value.data.data);
        } else {
          message.error(`Satış verileri yüklenemedi: ${salesResult.reason.message}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => summarize(stats), [stats]);
  const coverage = totals.totalProducts > 0
    ? Math.round((totals.totalEmbeddings / totals.totalProducts) * 100)
    : 0;

  if (loading) {
    return (
      <div className="loading-state">
        <Spin size="large" />
        <p>Dashboard yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Satış Dashboard</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Toplam Ürün" value={totals.totalProducts} prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Vektörlenmiş Ürün" value={totals.totalEmbeddings} prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Ortalama Fiyat" value={totals.avgPrice} prefix={<DollarOutlined />} suffix="₺"
              precision={0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Ortalama Puan" value={totals.avgRating} prefix={<StarOutlined />} suffix="/ 5"
              precision={1} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Kategori Bazında Ürün Dağılımı">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={formatNumber} />
                <Legend />
                <Bar dataKey="total_products" fill="#8884d8" name="Ürün Sayısı" />
                <Bar dataKey="embeddings_count" fill="#82ca9d" name="Embedding Sayısı" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Kategori Payları">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                  outerRadius={90}
                  dataKey="total_products"
                >
                  {stats.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatNumber} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Kategori İstatistikleri">
        <Table columns={TABLE_COLUMNS} dataSource={stats} rowKey="name" pagination={false} size="middle" />
      </Card>

      {salesData.length > 0 && (
        <Card title="Kategorilere Göre En Yüksek Fiyatlı Ürünler" style={{ marginTop: 24 }}>
          <Table
            columns={SALES_COLUMNS}
            dataSource={salesData}
            rowKey={(item) => `${item.source_table}-${item.product_name}-${item.price}`}
            pagination={{ pageSize: 10 }}
            size="middle"
            scroll={{ x: true }}
          />
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Embedding Kapsamı" style={{ textAlign: 'center' }}>
            <Progress type="circle" percent={coverage} />
            <p style={{ marginTop: 16 }}>
              {formatNumber(totals.totalEmbeddings)} / {formatNumber(totals.totalProducts)} ürün aranabilir durumda
            </p>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Aktif Kategoriler" style={{ textAlign: 'center' }}>
            <div className="big-number">{stats.length}</div>
            <p>Veri ve embedding tablosu bulunan kategori</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
