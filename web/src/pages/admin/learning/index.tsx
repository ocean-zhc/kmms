import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, message, Card, Table, Popconfirm } from 'antd';
import { CheckCircleFilled, DeleteOutlined } from '@ant-design/icons';
import { getDailyLearnings } from '@/services/api';
import './index.less';

const parse = (text: string) => {
  let date = '', name = '', goals = '';
  const dm = text.match(/(\d{1,2})[.月](\d{1,2})/);
  if (dm) {
    const now = new Date();
    date = `${now.getFullYear()}-${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}`;
  }
  const nm = text.match(/活动名称[：:]\s*(.+)/);
  if (nm) name = nm[1].trim();
  const gm = text.match(/活动目标[：:]\s*([\s\S]+)/);
  if (gm) goals = gm[1].trim();
  return { date, name, goals };
};

const LearningAdmin: React.FC = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const parsed = content ? parse(content) : null;

  const fetchList = async () => {
    setListLoading(true);
    try {
      const res = await getDailyLearnings(30);
      if (res.code === 0) setList(res.data || []);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return message.warning('请先粘贴内容');
    setLoading(true);
    try {
      const token = localStorage.getItem('kmms_token') || '';
      const res = await fetch('/api/admin/daily-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSuccess(true);
        setContent('');
        fetchList();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        message.error(data.message || '提交失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [content]);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('kmms_token') || '';
    const res = await fetch(`/api/admin/daily-learning/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 0) {
      message.success('已删除');
      fetchList();
    } else {
      message.error(data.message || '删除失败');
    }
  };

  const columns = [
    { title: '日期', dataIndex: 'activity_date', width: 110 },
    { title: '活动名称', dataIndex: 'activity_name', ellipsis: true },
    { title: '活动目标', dataIndex: 'activity_goals', ellipsis: true },
    {
      title: '操作', width: 70,
      render: (_: any, r: any) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="learning-admin">
      <Card title="快速录入" className="input-card">
        {success && (
          <div className="submit-success">
            <CheckCircleFilled /> 提交成功！
          </div>
        )}
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="从QQ群复制老师的消息，粘贴到这里..."
          autoSize={{ minRows: 4, maxRows: 10 }}
        />
        {parsed && parsed.name && (
          <div className="preview">
            <span className="preview-tag">预览</span>
            <span>{parsed.date}</span>
            <span className="preview-name">{parsed.name}</span>
          </div>
        )}
        <Button
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          disabled={!content.trim()}
          style={{ marginTop: 12 }}
        >
          提交
        </Button>
      </Card>

      <Card title="历史记录" style={{ marginTop: 16 }}>
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={listLoading}
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default LearningAdmin;
