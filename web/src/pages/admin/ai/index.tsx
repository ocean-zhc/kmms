import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Switch,
  Select,
  Table,
  Modal,
  Popconfirm,
  message,
  Typography,
  Space,
  Badge,
  DatePicker,
} from 'antd';
import {
  RobotOutlined,
  SaveOutlined,
  SyncOutlined,
  DeleteOutlined,
  CameraOutlined,
  SettingOutlined,
  DatabaseOutlined,
  DownOutlined,
  UpOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  getAiConfig,
  updateAiConfig,
  getAiModels,
  listAiSummaries,
  deleteAiSummary,
  clearAllAiSummaries,
  getOcrConfig,
  updateOcrConfig,
  checkAiAvailability,
} from '@/services/api';
import './index.less';

dayjs.extend(isoWeek);

const { Paragraph } = Typography;
const { TextArea } = Input;

const AiConfigPage: React.FC = () => {
  const isSuperAdmin = localStorage.getItem('kmms_role') === 'superadmin';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [models, setModels] = useState<Array<{ id: string; owned_by: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [ocrForm] = Form.useForm();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrModels, setOcrModels] = useState<Array<{ id: string; owned_by: string }>>([]);
  const [ocrModelsLoading, setOcrModelsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);

  // 折叠状态
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [ocrCollapsed, setOcrCollapsed] = useState(false);
  const [cacheCollapsed, setCacheCollapsed] = useState(false);

  // 可用性检查
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // 缓存筛选
  const [cacheFilterWeek, setCacheFilterWeek] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchSummaries();
    fetchOcrConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await getAiConfig();
      if (res.code === 0 && res.data) {
        form.setFieldsValue({
          api_url: res.data.api_url,
          api_key: res.data.api_key_masked,
          model: res.data.model,
          prompt: res.data.prompt,
          enabled: res.data.enabled,
          webhook_url: res.data.webhook_url,
        });
        setAiEnabled(res.data.enabled);
      }
    } catch (e) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaries = async () => {
    setSummariesLoading(true);
    try {
      const res = await listAiSummaries();
      if (res.code === 0) setSummaries(res.data || []);
    } catch (e) { /* ignore */ }
    finally { setSummariesLoading(false); }
  };

  const handleFetchModels = async () => {
    const apiUrl = form.getFieldValue('api_url');
    const apiKey = form.getFieldValue('api_key');
    if (!apiUrl || !apiKey) { message.warning('请先填写API地址和Key'); return; }
    setModelsLoading(true);
    try {
      const res = await getAiModels(apiUrl, apiKey);
      if (res.code === 0 && Array.isArray(res.data)) {
        setModels(res.data);
        message.success(`获取到 ${res.data.length} 个模型`);
      } else message.error(res.message || '获取模型失败');
    } catch (e) { message.error('获取模型列表失败'); }
    finally { setModelsLoading(false); }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await updateAiConfig(values);
      if (res.code === 0) { message.success('配置已保存'); fetchConfig(); }
      else message.error(res.message);
    } catch (e) { /* validation */ }
    finally { setSaving(false); }
  };

  const handleDeleteSummary = async (weekId: number) => {
    try {
      const res = await deleteAiSummary(weekId);
      if (res.code === 0) { message.success('已清除'); fetchSummaries(); }
      else message.error(res.message);
    } catch (e) { message.error('操作失败'); }
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '清空所有缓存',
      content: `确定清空全部 ${summaries.length} 条缓存？`,
      okText: '确定清空',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await clearAllAiSummaries();
          if (res.code === 0) { message.success(res.message || '已清空'); fetchSummaries(); }
          else message.error(res.message);
        } catch (e) { message.error('操作失败'); }
      },
    });
  };

  const fetchOcrConfig = async () => {
    setOcrLoading(true);
    try {
      const res = await getOcrConfig();
      if (res.code === 0 && res.data) {
        ocrForm.setFieldsValue({
          ocr_api_url: res.data.ocr_api_url,
          ocr_api_key: res.data.ocr_api_key_masked,
          ocr_model: res.data.ocr_model,
          ocr_enabled: res.data.ocr_enabled,
        });
        setOcrEnabled(res.data.ocr_enabled);
      }
    } catch (e) { /* ignore */ }
    finally { setOcrLoading(false); }
  };

  const handleFetchOcrModels = async () => {
    const apiUrl = ocrForm.getFieldValue('ocr_api_url');
    const apiKey = ocrForm.getFieldValue('ocr_api_key');
    if (!apiUrl || !apiKey) { message.warning('请先填写API地址和Key'); return; }
    setOcrModelsLoading(true);
    try {
      const res = await getAiModels(apiUrl, apiKey);
      if (res.code === 0 && Array.isArray(res.data)) {
        setOcrModels(res.data);
        message.success(`获取到 ${res.data.length} 个模型`);
      } else message.error(res.message || '获取失败');
    } catch (e) { message.error('获取模型列表失败'); }
    finally { setOcrModelsLoading(false); }
  };

  const handleSaveOcr = async () => {
    try {
      const values = await ocrForm.validateFields();
      setOcrSaving(true);
      const res = await updateOcrConfig(values);
      if (res.code === 0) { message.success('OCR配置已保存'); fetchOcrConfig(); }
      else message.error(res.message);
    } catch (e) { /* validation */ }
    finally { setOcrSaving(false); }
  };

  const renderModelSelector = (
    fieldName: string,
    modelsList: Array<{ id: string; owned_by: string }>,
    mlLoading: boolean,
    onFetch: () => void,
    hint: string,
  ) => (
    <>
      <Form.Item label="模型" required style={{ marginBottom: 0 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name={fieldName} noStyle rules={[{ required: true, message: '请选择模型' }]}>
            <Select
              showSearch
              allowClear
              placeholder="选择模型"
              style={{ flex: 1 }}
              loading={mlLoading}
              options={modelsList.map((m) => ({
                label: m.owned_by ? `${m.id} (${m.owned_by})` : m.id,
                value: m.id,
              }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={modelsList.length === 0 ? '点击获取' : '无匹配'}
            />
          </Form.Item>
          <Button icon={<SyncOutlined spin={mlLoading} />} onClick={onFetch} loading={mlLoading}>
            获取
          </Button>
        </Space.Compact>
      </Form.Item>
      <div className="field-hint">{hint}</div>
    </>
  );

  // 缓存筛选
  const filteredSummaries = cacheFilterWeek
    ? summaries.filter((s) => {
        const y = cacheFilterWeek.isoWeekYear();
        const w = cacheFilterWeek.isoWeek();
        return s.year === y && s.week_number === w;
      })
    : summaries;

  const cacheColumns = [
    { title: '周次', key: 'week', width: 140, render: (_: any, r: any) => `${r.year}年 第${r.week_number}周` },
    { title: '日期', key: 'date', width: 190, render: (_: any, r: any) => `${r.week_start} ~ ${r.week_end}` },
    {
      title: '总结内容', dataIndex: 'summary', ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }} style={{ margin: 0, fontSize: 13 }}>{text}</Paragraph>
      ),
    },
    { title: '生成时间', dataIndex: 'created_at', width: 160 },
    {
      title: '', key: 'action', width: 60,
      render: (_: any, r: any) => (
        <Popconfirm title="确定清除？" onConfirm={() => handleDeleteSummary(r.week_id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="ai-config-page">
      <div className="page-header">
        <span><SettingOutlined /> AI 功能配置</span>
        <Button
          icon={<ThunderboltOutlined />}
          loading={checking}
          onClick={async () => {
            setChecking(true);
            setCheckResult(null);
            try {
              const res = await checkAiAvailability();
              if (res.code === 0) {
                setCheckResult(res.data);
                if (res.data.all_ok) {
                  message.success('所有 AI 服务正常');
                } else {
                  message.warning('部分 AI 服务异常，请检查');
                }
              }
            } catch { message.error('检查失败'); }
            finally { setChecking(false); }
          }}
        >
          可用性检查
        </Button>
      </div>
      {checkResult && (
        <div className="check-result-bar">
          {Object.entries(checkResult.results).map(([key, val]: [string, any]) => (
            <span key={key} className={`check-item ${val.ok ? 'ok' : 'fail'}`}>
              {val.ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              {' '}{key === 'ai_summary' ? 'AI营养总结' : 'OCR识别'}
              {val.ok ? ` (${val.latency}ms)` : `: ${val.error}`}
            </span>
          ))}
        </div>
      )}

      {!isSuperAdmin && (
        <div className="readonly-banner">
          <LockOutlined /> 当前为系统管理员，AI 配置仅可查看。如需修改请使用配置管理员账号登录。
        </div>
      )}

      {/* 上：左右两栏 */}
      <div className="config-row">
        {/* 左：AI营养总结 */}
        <div className="config-card card-ai">
          <div className="card-header" onClick={() => setAiCollapsed(!aiCollapsed)}>
            <div className="card-title">
              <span><RobotOutlined /> AI 营养总结</span>
              <Badge status={aiEnabled ? 'success' : 'default'} text={aiEnabled ? '已启用' : '未启用'} />
            </div>
            <div className="card-meta">
              <span className="card-desc">根据每周食谱自动生成营养点评</span>
              {aiCollapsed ? <DownOutlined className="toggle-icon" /> : <UpOutlined className="toggle-icon" />}
            </div>
          </div>
          {!aiCollapsed && (
            <div className="card-body">
              <Form form={form} layout="vertical" className="config-form" disabled={!isSuperAdmin}>
                <Form.Item name="enabled" label="启用" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" onChange={(v) => setAiEnabled(v)} />
                </Form.Item>
                <Form.Item name="api_url" label="API 地址" rules={[{ required: true, message: '必填' }]}>
                  <Input placeholder="https://api.openai.com/v1" />
                </Form.Item>
                <Form.Item name="api_key" label="API Key" rules={[{ required: true, message: '必填' }]}
                  extra="脱敏Key保持不动即不会被覆盖">
                  <Input.Password placeholder="sk-..." />
                </Form.Item>
                {renderModelSelector('model', models, modelsLoading, handleFetchModels, '填写地址和Key后点击获取')}
                <Form.Item name="prompt" label="系统提示词" rules={[{ required: true, message: '必填' }]}>
                  <TextArea rows={4} placeholder="你是一位专业的幼儿营养师..." />
                </Form.Item>
                <Form.Item name="webhook_url" label="告警通知 Webhook" tooltip="企业微信机器人 Webhook 地址，每日 8:00 自动检查 AI 可用性并通知">
                  <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
                </Form.Item>
                {isSuperAdmin && (
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存</Button>
                  </Form.Item>
                )}
              </Form>
            </div>
          )}
        </div>

        {/* 右：OCR食谱识别 */}
        <div className="config-card card-ocr">
          <div className="card-header" onClick={() => setOcrCollapsed(!ocrCollapsed)}>
            <div className="card-title">
              <span><CameraOutlined /> OCR 食谱识别</span>
              <Badge status={ocrEnabled ? 'success' : 'default'} text={ocrEnabled ? '已启用' : '未启用'} />
            </div>
            <div className="card-meta">
              <span className="card-desc">上传食谱图片自动识别菜品</span>
              {ocrCollapsed ? <DownOutlined className="toggle-icon" /> : <UpOutlined className="toggle-icon" />}
            </div>
          </div>
          {!ocrCollapsed && (
            <div className="card-body">
              <Form form={ocrForm} layout="vertical" className="config-form" disabled={!isSuperAdmin}>
                <Form.Item name="ocr_enabled" label="启用" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" onChange={(v) => setOcrEnabled(v)} />
                </Form.Item>
                <Form.Item name="ocr_api_url" label="API 地址" rules={[{ required: true, message: '必填' }]}>
                  <Input placeholder="https://api.siliconflow.cn/v1" />
                </Form.Item>
                <Form.Item name="ocr_api_key" label="API Key" rules={[{ required: true, message: '必填' }]}>
                  <Input.Password placeholder="sk-..." />
                </Form.Item>
                {renderModelSelector('ocr_model', ocrModels, ocrModelsLoading, handleFetchOcrModels, '需选择支持图片的视觉模型')}
                {isSuperAdmin && (
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveOcr} loading={ocrSaving}>保存</Button>
                  </Form.Item>
                )}
              </Form>
            </div>
          )}
        </div>
      </div>

      {/* 下：缓存管理 */}
      <div className="config-card card-cache">
        <div className="card-header" onClick={() => setCacheCollapsed(!cacheCollapsed)}>
          <div className="card-title">
            <span>
              <DatabaseOutlined /> 缓存管理
              {summaries.length > 0 && <span className="cache-count">{summaries.length} 条</span>}
            </span>
            <Space size="middle">
              {!cacheCollapsed && summaries.length > 0 && (
                <Button danger size="small" onClick={(e) => { e.stopPropagation(); handleClearAll(); }}>清空全部</Button>
              )}
              {cacheCollapsed ? <DownOutlined className="toggle-icon" /> : <UpOutlined className="toggle-icon" />}
            </Space>
          </div>
        </div>
        {!cacheCollapsed && (
          <div className="card-body">
            <div className="cache-toolbar">
              <DatePicker
                picker="week"
                placeholder="按周次筛选"
                value={cacheFilterWeek}
                onChange={(val) => setCacheFilterWeek(val)}
                allowClear
                style={{ width: 200 }}
                format={(val) => `${val.isoWeekYear()}年 第${val.isoWeek()}周`}
              />
              {cacheFilterWeek && (
                <span className="filter-result">
                  筛选到 {filteredSummaries.length} 条
                </span>
              )}
            </div>
            <Table
              rowKey="id"
              columns={cacheColumns}
              dataSource={filteredSummaries}
              loading={summariesLoading}
              pagination={{ defaultPageSize: 5, showSizeChanger: true, pageSizeOptions: ['5', '10'], showTotal: (t) => `共 ${t} 条` }}
              size="small"
              locale={{ emptyText: cacheFilterWeek ? '该周无缓存' : '暂无缓存' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AiConfigPage;
