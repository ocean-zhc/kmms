import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Space, Spin, message, Typography, Tag, Card, Modal, Input, Upload, Table, Select, Popconfirm, Image } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined, CameraOutlined, UploadOutlined, LinkOutlined, DeleteOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { history, useParams } from 'umi';
import MenuGrid from '@/components/MenuGrid';
import {
  getAdminWeekDetail,
  updateWeekItems,
  publishWeek,
  getAllDishes,
  ocrRecognize,
  batchCreateDishes,
} from '@/services/api';
import './edit.less';

const { Title } = Typography;

interface MenuItem {
  weekday: number;
  meal_type: string;
  content: string;
}

interface OcrDish {
  weekday: number;
  meal_type: string;
  dishes: string[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  archived: { label: '已归档', color: 'blue' },
};

const WEEKDAY_NAMES = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const MEAL_LABELS: Record<string, string> = { lunch: '营养午餐', snack: '快乐午点' };

const WeekEditPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const weekId = params.id ? parseInt(params.id, 10) : 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekData, setWeekData] = useState<any>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dishes, setDishes] = useState<any[]>([]);

  // OCR 状态
  const [ocrVisible, setOcrVisible] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrImageUrl, setOcrImageUrl] = useState('');
  const [ocrInputMode, setOcrInputMode] = useState<'url' | 'upload'>('url');
  const [ocrBase64, setOcrBase64] = useState('');
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrElapsed, setOcrElapsed] = useState(0);
  const ocrTimerRef = useRef<any>(null);
  const [ocrPreviewSrc, setOcrPreviewSrc] = useState('');
  // OCR 审核
  const [ocrReviewVisible, setOcrReviewVisible] = useState(false);
  const [ocrResults, setOcrResults] = useState<OcrDish[]>([]);

  useEffect(() => {
    if (weekId) {
      fetchDetail();
      fetchDishes();
    }
  }, [weekId]);

  const fetchDishes = async () => {
    try {
      const res = await getAllDishes();
      if (res.code === 0) {
        setDishes(res.data || []);
      }
    } catch (e) {
      console.error('加载菜谱失败', e);
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getAdminWeekDetail(weekId);
      if (res.code === 0) {
        setWeekData(res.data);
        const existingItems: MenuItem[] = res.data.items || [];
        const fullItems: MenuItem[] = [];
        for (let day = 1; day <= 7; day++) {
          for (const type of ['lunch', 'snack']) {
            const existing = existingItems.find(
              (i: MenuItem) => i.weekday === day && i.meal_type === type,
            );
            fullItems.push({
              weekday: day,
              meal_type: type,
              content: existing?.content || '',
            });
          }
        }
        setItems(fullItems);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback(
    (weekday: number, mealType: string, content: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.weekday === weekday && item.meal_type === mealType
            ? { ...item, content }
            : item,
        ),
      );
      setHasChanges(true);
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateWeekItems(weekId, items);
      if (res.code === 0) {
        message.success('保存成功');
        setHasChanges(false);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (hasChanges) {
      setSaving(true);
      try {
        await updateWeekItems(weekId, items);
      } catch (e) {
        message.error('保存失败，无法发布');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    try {
      const res = await publishWeek(weekId);
      if (res.code === 0) {
        message.success('发布成功');
        setHasChanges(false);
        fetchDetail();
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('发布失败');
    }
  };

  // ============ OCR ============

  const handleOcrOpen = () => {
    setOcrVisible(true);
    setOcrImageUrl('');
    setOcrBase64('');
    setOcrFileName('');
    setOcrInputMode('url');
  };

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleOcrSubmit = async () => {
    const payload: { image_url?: string; image_base64?: string } = {};
    if (ocrInputMode === 'url') {
      if (!ocrImageUrl.trim()) {
        message.warning('请输入图片URL');
        return;
      }
      payload.image_url = ocrImageUrl.trim();
    } else {
      if (!ocrBase64) {
        message.warning('请上传图片');
        return;
      }
      payload.image_base64 = ocrBase64;
    }

    setOcrLoading(true);
    setOcrElapsed(0);
    ocrTimerRef.current = setInterval(() => setOcrElapsed((s) => s + 1), 1000);
    try {
      const res = await ocrRecognize(payload);
      if (res.code === 0 && res.data?.items) {
        setOcrResults(res.data.items);
        setOcrPreviewSrc(ocrInputMode === 'url' ? ocrImageUrl : ocrBase64);
        setOcrVisible(false);
        setOcrReviewVisible(true);
        message.success('识别完成，请审核结果');
      } else {
        message.error(res.message || '识别失败');
      }
    } catch (e) {
      message.error('OCR请求失败，可能超时，请重试');
    } finally {
      clearInterval(ocrTimerRef.current);
      setOcrLoading(false);
    }
  };

  const handleOcrReviewConfirm = async () => {
    // 1. 将 OCR 结果填充到食谱网格
    const newItems = [...items];
    for (const ocrItem of ocrResults) {
      const idx = newItems.findIndex(
        (i) => i.weekday === ocrItem.weekday && i.meal_type === ocrItem.meal_type,
      );
      if (idx >= 0 && ocrItem.dishes.length > 0) {
        newItems[idx] = { ...newItems[idx], content: ocrItem.dishes.join('|||') };
      }
    }
    setItems(newItems);
    setHasChanges(true);

    // 2. 收集所有菜品，去重后批量入库
    const allDishItems: Array<{ name: string; meal_type: string }> = [];
    for (const ocrItem of ocrResults) {
      for (const dishName of ocrItem.dishes) {
        const name = dishName.trim();
        if (name && !allDishItems.some((d) => d.name === name && d.meal_type === ocrItem.meal_type)) {
          allDishItems.push({ name, meal_type: ocrItem.meal_type });
        }
      }
    }

    if (allDishItems.length > 0) {
      try {
        const res = await batchCreateDishes(allDishItems);
        if (res.code === 0) {
          const { added, skipped } = res.data;
          if (added > 0) {
            message.success(`新增 ${added} 个菜品到菜谱库${skipped > 0 ? `，${skipped} 个已存在` : ''}`);
          }
          fetchDishes();
        }
      } catch (e) {
        console.error('批量入库失败', e);
      }
    }

    setOcrReviewVisible(false);
    message.success('已填充到食谱');
  };

  // 审核表格中编辑单个菜品
  const handleOcrResultEdit = (index: number, field: keyof OcrDish, value: any) => {
    setOcrResults((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleOcrResultDelete = (index: number) => {
    setOcrResults((prev) => prev.filter((_, i) => i !== index));
  };

  const ocrReviewColumns = [
    {
      title: '星期',
      dataIndex: 'weekday',
      width: 100,
      render: (v: number, _: any, index: number) => (
        <Select
          value={v}
          onChange={(val: number) => handleOcrResultEdit(index, 'weekday', val)}
          style={{ width: 90 }}
          options={[1,2,3,4,5,6,7].map((d) => ({ label: WEEKDAY_NAMES[d], value: d }))}
        />
      ),
    },
    {
      title: '餐类',
      dataIndex: 'meal_type',
      width: 120,
      render: (v: string, _: any, index: number) => (
        <Select
          value={v}
          onChange={(val: string) => handleOcrResultEdit(index, 'meal_type', val)}
          style={{ width: 110 }}
          options={[
            { label: '营养午餐', value: 'lunch' },
            { label: '快乐午点', value: 'snack' },
          ]}
        />
      ),
    },
    {
      title: '菜品（可编辑）',
      dataIndex: 'dishes',
      render: (dishes: string[], _: any, index: number) => (
        <Select
          mode="tags"
          value={dishes}
          onChange={(val: string[]) => handleOcrResultEdit(index, 'dishes', val)}
          style={{ width: '100%' }}
          placeholder="可添加/删除/修改菜品"
          tokenSeparators={[',']}
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleOcrResultDelete(index)} />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!weekData) {
    return <div>食谱不存在</div>;
  }

  const status = statusLabels[weekData.status] || statusLabels.draft;

  return (
    <div className="week-edit-page">
      <div className="edit-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/admin/weeks')}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {weekData.year}年 第{weekData.week_number}周
          </Title>
          <Tag color={status.color}>{status.label}</Tag>
        </Space>
        <Space>
          <Button
            icon={<CameraOutlined />}
            onClick={handleOcrOpen}
          >
            OCR识别
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存
          </Button>
          {weekData.status === 'draft' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handlePublish}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              保存并发布
            </Button>
          )}
        </Space>
      </div>

      <Card className="edit-card">
        <div className="date-info">
          日期范围：{weekData.week_start} ~ {weekData.week_end}
        </div>
        <MenuGrid
          items={items}
          editable
          onChange={handleChange}
          weekStart={weekData.week_start}
          weekEnd={weekData.week_end}
          dishes={dishes}
        />
      </Card>

      {/* OCR 输入弹窗 */}
      <Modal
        title="OCR识别食谱"
        open={ocrVisible}
        onCancel={() => { if (!ocrLoading) setOcrVisible(false); }}
        onOk={handleOcrSubmit}
        confirmLoading={ocrLoading}
        okText={ocrLoading ? `识别中 ${ocrElapsed}s` : '开始识别'}
        cancelButtonProps={{ disabled: ocrLoading }}
        closable={!ocrLoading}
        maskClosable={!ocrLoading}
        width={520}
      >
        {ocrLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, fontSize: 16, color: '#1890ff' }}>
              正在识别食谱图片... {ocrElapsed}s
            </div>
            <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>
              视觉模型推理需要一定时间，请耐心等待
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Button
                  type={ocrInputMode === 'url' ? 'primary' : 'default'}
                  icon={<LinkOutlined />}
                  size="small"
                  onClick={() => setOcrInputMode('url')}
                >
                  图片URL
                </Button>
                <Button
                  type={ocrInputMode === 'upload' ? 'primary' : 'default'}
                  icon={<UploadOutlined />}
                  size="small"
                  onClick={() => setOcrInputMode('upload')}
                >
                  上传图片
                </Button>
              </Space>
            </div>

            {ocrInputMode === 'url' ? (
              <Input
                placeholder="输入食谱图片URL，如 https://example.com/menu.jpg"
                value={ocrImageUrl}
                onChange={(e) => setOcrImageUrl(e.target.value)}
              />
            ) : (
              <div>
                <Upload
                  accept="image/*"
                  maxCount={1}
                  beforeUpload={async (file) => {
                    const base64 = await handleFileToBase64(file);
                    setOcrBase64(base64);
                    setOcrFileName(file.name);
                    return false;
                  }}
                  onRemove={() => {
                    setOcrBase64('');
                    setOcrFileName('');
                  }}
                  fileList={ocrFileName ? [{ uid: '1', name: ocrFileName, status: 'done' } as any] : []}
                >
                  <Button icon={<UploadOutlined />}>选择图片</Button>
                </Upload>
              </div>
            )}

            {(ocrImageUrl || ocrBase64) && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <img
                  src={ocrInputMode === 'url' ? ocrImageUrl : ocrBase64}
                  alt="预览"
                  referrerPolicy="no-referrer"
                  style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4, border: '1px solid #d9d9d9' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* OCR 审核弹窗 */}
      <Modal
        title="审核识别结果"
        open={ocrReviewVisible}
        onCancel={() => setOcrReviewVisible(false)}
        onOk={handleOcrReviewConfirm}
        okText="确认填充"
        width={1100}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>
          {/* 左侧：原图 */}
          <div
            style={{
              width: 380,
              flexShrink: 0,
              borderRight: '1px solid #f0f0f0',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13, color: '#666' }}>
              原始图片（点击可放大）
            </div>
            <div style={{ flex: 1, overflow: 'auto', textAlign: 'center' }}>
              {ocrPreviewSrc && (
                <Image
                  src={ocrPreviewSrc}
                  alt="食谱原图"
                  referrerPolicy="no-referrer"
                  style={{ maxWidth: '100%', borderRadius: 4 }}
                />
              )}
            </div>
          </div>
          {/* 右侧：识别结果 */}
          <div style={{ flex: 1, padding: 16, overflow: 'auto', maxHeight: 550 }}>
            <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
              请对照左侧原图检查识别结果，可修改星期、餐类和菜品。确认后将填充到食谱并自动将新菜品入库。
            </div>
            <Table
              rowKey={(_, i) => String(i)}
              columns={ocrReviewColumns}
              dataSource={ocrResults}
              pagination={false}
              size="small"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeekEditPage;
