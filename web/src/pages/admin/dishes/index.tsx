import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  message,
  Form,
  Input,
  Select,
  Popconfirm,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getDishes, createDish, batchCreateDishes, updateDish, deleteDish, batchDeleteDishes } from '@/services/api';

const { Title } = Typography;

const mealTypeMap: Record<string, { label: string; color: string }> = {
  lunch: { label: '营养午餐', color: 'orange' },
  snack: { label: '快乐午点', color: 'blue' },
};

const DishesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData(1);
  }, [mealTypeFilter]);

  const fetchData = async (p: number) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize };
      if (mealTypeFilter) params.meal_type = mealTypeFilter;
      if (keyword) params.keyword = keyword;
      const res = await getDishes(params);
      if (res.code === 0) {
        setData(res.data.list || []);
        setTotal(res.data.total || 0);
        setPage(p);
      }
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData(1);
  };

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ meal_type: mealTypeFilter || 'lunch' });
    setModalVisible(true);
  };

  const openEditModal = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.name, meal_type: record.meal_type });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        // 编辑单条
        const res = await updateDish(editingId, values);
        if (res.code === 0) {
          message.success('修改成功');
          setModalVisible(false);
          form.resetFields();
          fetchData(page);
        } else {
          message.error(res.message);
        }
      } else {
        // 批量添加：仅按换行分割，每行一个菜品
        const names = (values.names as string)
          .split(/\n/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (names.length === 0) {
          message.warning('请输入菜品名称');
          return;
        }
        const items = names.map((name: string) => ({
          name,
          meal_type: values.meal_type,
        }));
        const res = await batchCreateDishes(items);
        if (res.code === 0) {
          message.success(res.message || `添加成功`);
          setModalVisible(false);
          form.resetFields();
          fetchData(1);
        } else {
          message.error(res.message);
        }
      }
    } catch (e: any) {
      if (e?.data?.message) message.error(e.data.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteDish(id);
      if (res.code === 0) {
        message.success('删除成功');
        fetchData(page);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的菜品');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定删除选中的 ${selectedRowKeys.length} 个菜品？`,
      okText: '确定删除',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await batchDeleteDishes(selectedRowKeys as number[]);
          if (res.code === 0) {
            message.success(res.message || '删除成功');
            setSelectedRowKeys([]);
            fetchData(page);
          } else {
            message.error(res.message);
          }
        } catch (e) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '菜品名称',
      dataIndex: 'name',
      width: '35%',
      ellipsis: true,
      sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh-CN'),
    },
    {
      title: '分类',
      dataIndex: 'meal_type',
      width: '15%',
      sorter: (a: any, b: any) => a.meal_type.localeCompare(b.meal_type),
      render: (v: string) => {
        const t = mealTypeMap[v] || mealTypeMap.lunch;
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      width: '25%',
      sorter: (a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || ''),
      render: (v: string) => v ? v.substring(0, 19) : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: '15%',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>菜谱管理</Title>
        <Space wrap>
          <Input.Search
            placeholder="搜索菜品"
            allowClear
            style={{ width: 180 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 130 }}
            onChange={(v) => setMealTypeFilter(v || '')}
            options={[
              { label: '营养午餐', value: 'lunch' },
              { label: '快乐午点', value: 'snack' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            添加菜品
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              删除选中 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          total,
          current: page,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p, ps) => {
            setPageSize(ps);
            fetchData(p);
          },
          showTotal: (t) => `共 ${t} 个菜品`,
        }}
        size="middle"
      />

      <Modal
        title={editingId ? '编辑菜品' : '批量添加菜品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          {editingId ? (
            <Form.Item
              name="name"
              label="菜品名称"
              rules={[{ required: true, message: '请输入菜品名称' }]}
            >
              <Input placeholder="如：红烧排骨" />
            </Form.Item>
          ) : (
            <Form.Item
              name="names"
              label="菜品名称"
              rules={[{ required: true, message: '请输入菜品名称' }]}
              extra="每行一个菜品，自动去重。菜名中可包含顿号、逗号、括号等。"
            >
              <Input.TextArea
                rows={5}
                placeholder={'红烧排骨\n清炒西兰花\n紫菜蛋花汤'}
              />
            </Form.Item>
          )}
          <Form.Item
            name="meal_type"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              options={[
                { label: '营养午餐', value: 'lunch' },
                { label: '快乐午点', value: 'snack' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DishesPage;
