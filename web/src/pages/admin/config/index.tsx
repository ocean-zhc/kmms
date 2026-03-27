import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Spin } from 'antd';
import { getAdminSiteConfig, updateSiteConfig } from '@/services/api';

const { TextArea } = Input;

const SiteConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminSiteConfig();
        if (res.code === 0) {
          const map: Record<string, string> = {};
          (res.data || []).forEach((r: any) => { map[r.key] = r.value; });
          form.setFieldsValue(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await updateSiteConfig(values);
      if (res.code === 0) message.success('保存成功');
      else message.error(res.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>站点配置</h3>
        <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
      </div>

      <Form form={form} layout="vertical">
        <Card title="关于页面" size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="about_text" label="关于我们（支持 Markdown）">
            <TextArea rows={4} placeholder="关于我们的介绍文案" />
          </Form.Item>
          <Form.Item name="app_version" label="版本号">
            <Input placeholder="如 1.0.0" style={{ width: 200 }} />
          </Form.Item>
        </Card>

        <Card title="功能特色" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="features"
            label="功能列表（JSON 数组）"
            extra='格式：[{"icon":"📋","name":"每周食谱","desc":"实时查看本周食谱安排"}]'
          >
            <TextArea rows={6} placeholder='[{"icon":"📋","name":"名称","desc":"描述"}]' />
          </Form.Item>
        </Card>
      </Form>
    </div>
  );
};

export default SiteConfigPage;
