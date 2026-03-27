import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, InputNumber, message, Popconfirm, Space, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { getAdminNotices, createNotice, updateNotice, deleteNotice } from '@/services/api';
import { marked } from 'marked';

const { TextArea } = Input;

const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await getAdminNotices();
      if (res.code === 0) setNotices(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateNotice(editing.id, values);
      message.success('更新成功');
    } else {
      await createNotice(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    form.resetFields();
    setEditing(null);
    fetchNotices();
  };

  const handleEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteNotice(id);
    message.success('已删除');
    fetchNotices();
  };

  const handleToggle = async (id: number, checked: boolean) => {
    await updateNotice(id, { is_active: checked });
    fetchNotices();
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      width: '15%',
      render: (v: string) => v || <span style={{ color: '#ccc' }}>无标题</span>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      render: (v: string) => (
        <div
          style={{ fontSize: 13, lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: marked.parse(v || '', { async: false }) as string }}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      align: 'center' as const,
      render: (v: boolean, record: any) => (
        <Switch
          size="small"
          checked={v}
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>公告管理</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          新增公告
        </Button>
      </div>

      <Table
        dataSource={notices}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editing ? '编辑公告' : '新增公告'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ sort_order: 0, is_active: true }}>
          <Form.Item name="title" label="标题">
            <Input placeholder="可选，如：温馨提示" />
          </Form.Item>
          <Form.Item name="content" label="内容（支持 Markdown）" rules={[{ required: true, message: '请输入公告内容' }]}>
            <TextArea rows={6} placeholder="支持 Markdown 语法，如 **加粗**、*斜体*、- 列表" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（越小越前）">
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NoticesPage;
