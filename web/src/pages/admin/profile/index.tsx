import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Descriptions,
  Divider,
  Typography,
} from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { getCurrentUser, changePassword } from '@/services/api';
import './index.less';

const { Title } = Typography;

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await getCurrentUser();
      if (res.code === 0) {
        setUser(res.data);
      }
    } catch (e) {
      // 从 localStorage 兜底
      const userStr = localStorage.getItem('kmms_user');
      if (userStr) setUser(JSON.parse(userStr));
    }
  };

  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      if (res.code === 0) {
        message.success('密码修改成功，请重新登录');
        form.resetFields();
        // 清除登录状态，跳转登录页
        setTimeout(() => {
          localStorage.removeItem('kmms_token');
          localStorage.removeItem('kmms_user');
          window.location.href = '/admin/login';
        }, 1500);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e?.data?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Title level={4}>
        <UserOutlined /> 个人中心
      </Title>

      <Card title="账号信息" className="profile-card">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="用户名">
            {user?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="姓名">
            {user?.realName || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <span>
            <LockOutlined /> 修改密码
          </span>
        }
        className="profile-card"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
