import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { login } from '@/services/api';
import './login.less';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values);
      if (res.code === 0) {
        localStorage.setItem('kmms_token', res.data.token);
        localStorage.setItem('kmms_user', JSON.stringify(res.data.user));
        localStorage.setItem('kmms_role', res.data.user.role || 'admin');
        message.success('登录成功');
        history.push('/admin/weeks');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (e: any) {
      message.error(e?.data?.message || '登录失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">🍱</div>
          <Title level={3}>食谱管理系统</Title>
          <p className="login-subtitle">管理员登录</p>
        </div>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登 录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
