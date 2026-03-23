import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  message,
  Form,
  Popconfirm,
  Select,
  Typography,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { history } from 'umi';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import {
  getAdminWeeks,
  createWeek,
  deleteWeek,
  publishWeek,
  archiveWeek,
  copyWeek,
} from '@/services/api';

dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);
dayjs.extend(isLeapYear);

const { Title } = Typography;

/** 根据选中日期推算所在周信息 */
const getWeekInfo = (date: dayjs.Dayjs) => {
  const year = date.isoWeekYear();
  const week = date.isoWeek();
  const weekStart = date.isoWeekday(1).format('YYYY-MM-DD');
  const weekEnd = date.isoWeekday(7).format('YYYY-MM-DD');
  return { year, week, weekStart, weekEnd };
};

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  archived: { label: '已归档', color: 'blue' },
};

const WeeksListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 新建周弹窗
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [newWeekInfo, setNewWeekInfo] = useState<{ year: number; week: number; weekStart: string; weekEnd: string } | null>(null);

  // 复制周弹窗
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copySourceId, setCopySourceId] = useState<number>(0);
  const [copyWeekInfo, setCopyWeekInfo] = useState<{ year: number; week: number; weekStart: string; weekEnd: string } | null>(null);

  useEffect(() => {
    fetchData(page);
  }, [statusFilter]);

  const fetchData = async (p: number) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminWeeks(params);
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

  const handleCreate = async () => {
    if (!newWeekInfo) {
      message.warning('请先选择日期');
      return;
    }
    try {
      const res = await createWeek({ year: newWeekInfo.year, week_number: newWeekInfo.week });
      if (res.code === 0) {
        message.success('创建成功');
        setNewModalVisible(false);
        setNewWeekInfo(null);
        history.push(`/admin/weeks/edit/${res.data.id}`);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      if (e?.data?.message) message.error(e.data.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteWeek(id);
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

  const handlePublish = async (id: number) => {
    try {
      const res = await publishWeek(id);
      if (res.code === 0) {
        message.success('发布成功');
        fetchData(page);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      const res = await archiveWeek(id);
      if (res.code === 0) {
        message.success('归档成功');
        fetchData(page);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleCopy = async () => {
    if (!copyWeekInfo) {
      message.warning('请先选择目标日期');
      return;
    }
    try {
      const res = await copyWeek(copySourceId, {
        target_year: copyWeekInfo.year,
        target_week: copyWeekInfo.week,
      });
      if (res.code === 0) {
        message.success('复制成功');
        setCopyModalVisible(false);
        setCopyWeekInfo(null);
        fetchData(page);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      if (e?.data?.message) message.error(e.data.message);
    }
  };

  const openCopyModal = (id: number) => {
    setCopySourceId(id);
    setCopyWeekInfo(null);
    setCopyModalVisible(true);
  };

  const columns = [
    {
      title: '年份',
      dataIndex: 'year',
      width: 80,
      sorter: (a: any, b: any) => a.year - b.year,
    },
    {
      title: '周次',
      dataIndex: 'week_number',
      width: 90,
      sorter: (a: any, b: any) => a.week_number - b.week_number,
      render: (v: number) => `第${v}周`,
    },
    {
      title: '日期范围',
      key: 'date_range',
      width: 220,
      sorter: (a: any, b: any) => a.week_start.localeCompare(b.week_start),
      render: (_: any, record: any) => `${record.week_start} ~ ${record.week_end}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
      render: (status: string) => {
        const s = statusMap[status] || statusMap.draft;
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '发布时间',
      dataIndex: 'published_at',
      width: 170,
      sorter: (a: any, b: any) => (a.published_at || '').localeCompare(b.published_at || ''),
      render: (v: string) => v ? v.substring(0, 19) : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: any, record: any) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => history.push(`/admin/weeks/edit/${record.id}`)}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Popconfirm title="确定发布此周食谱？" onConfirm={() => handlePublish(record.id)}>
              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {record.status === 'published' && (
            <Popconfirm title="确定归档此周食谱？" onConfirm={() => handleArchive(record.id)}>
              <Button type="link" size="small" icon={<InboxOutlined />}>
                归档
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => openCopyModal(record.id)}
          >
            复制
          </Button>
          <Popconfirm title="确定删除？删除后不可恢复" onConfirm={() => handleDelete(record.id)}>
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
        <Title level={4} style={{ margin: 0 }}>食谱管理</Title>
        <Space wrap>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 120 }}
            onChange={(v) => setStatusFilter(v || '')}
            options={[
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
              { label: '已归档', value: 'archived' },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              const info = getWeekInfo(dayjs());
              setNewWeekInfo(info);
              setNewModalVisible(true);
            }}
          >
            新建周食谱
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
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
          showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 800 }}
      />

      {/* 新建周弹窗 */}
      <Modal
        title="新建周食谱"
        open={newModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setNewModalVisible(false);
          setNewWeekInfo(null);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>选择任意一天，自动定位到该周：</div>
          <DatePicker
            style={{ width: '100%' }}
            defaultValue={dayjs()}
            onChange={(date) => {
              if (date) {
                setNewWeekInfo(getWeekInfo(date));
              } else {
                setNewWeekInfo(null);
              }
            }}
            placeholder="请选择日期"
          />
        </div>
        {newWeekInfo && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
              {newWeekInfo.year}年 第{newWeekInfo.week}周
            </p>
            <p style={{ margin: '4px 0 0', color: '#666' }}>
              {newWeekInfo.weekStart}（周一）~ {newWeekInfo.weekEnd}（周日）
            </p>
          </div>
        )}
      </Modal>

      {/* 复制周弹窗 */}
      <Modal
        title="复制周食谱到..."
        open={copyModalVisible}
        onOk={handleCopy}
        onCancel={() => {
          setCopyModalVisible(false);
          setCopyWeekInfo(null);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>选择目标周的任意一天：</div>
          <DatePicker
            style={{ width: '100%' }}
            onChange={(date) => {
              if (date) {
                setCopyWeekInfo(getWeekInfo(date));
              } else {
                setCopyWeekInfo(null);
              }
            }}
            placeholder="请选择目标日期"
          />
        </div>
        {copyWeekInfo && (
          <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
              复制到：{copyWeekInfo.year}年 第{copyWeekInfo.week}周
            </p>
            <p style={{ margin: '4px 0 0', color: '#666' }}>
              {copyWeekInfo.weekStart}（周一）~ {copyWeekInfo.weekEnd}（周日）
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeeksListPage;
