import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import './submit.less';

const SECRET_KEY = 'kmms_learning_secret';

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

const SubmitPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [secret, setSecret] = useState(() => localStorage.getItem(SECRET_KEY) || '');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const parsed = content ? parse(content) : null;

  useEffect(() => {
    if (!localStorage.getItem(SECRET_KEY)) setShowSecret(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return message.warning('请先粘贴内容');
    if (!secret.trim()) { setShowSecret(true); return message.warning('请输入密钥'); }

    setLoading(true);
    try {
      const res = await fetch('/api/public/daily-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, content }),
      });
      const data = await res.json();
      if (data.code === 0) {
        localStorage.setItem(SECRET_KEY, secret);
        setSuccess(true);
        setContent('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        message.error(data.message || '提交失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [content, secret]);

  return (
    <div className="submit-page">
      <div className="submit-hero">
        <span className="submit-badge">Quick Submit</span>
        <h1 className="submit-title">今日所学录入</h1>
        <p className="submit-sub">从QQ群复制消息，粘贴即可提交</p>
      </div>

      {success && (
        <div className="submit-success">
          <CheckCircleFilled />
          <span>提交成功！</span>
        </div>
      )}

      <div className="submit-card">
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="长按复制老师发的消息，在这里粘贴..."
          autoSize={{ minRows: 5, maxRows: 12 }}
          className="submit-textarea"
        />

        {parsed && parsed.name && (
          <div className="submit-preview">
            <div className="preview-title">解析预览</div>
            <div className="preview-row">
              <span className="preview-label">日期</span>
              <span className="preview-value">{parsed.date || '未识别'}</span>
            </div>
            <div className="preview-row">
              <span className="preview-label">活动</span>
              <span className="preview-value">{parsed.name}</span>
            </div>
            <div className="preview-row">
              <span className="preview-label">目标</span>
              <span className="preview-value preview-goals">{parsed.goals || '未识别'}</span>
            </div>
          </div>
        )}

        {showSecret && (
          <Input.Password
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="输入密钥（首次需要，之后自动记住）"
            className="submit-secret"
          />
        )}

        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleSubmit}
          className="submit-btn"
          disabled={!content.trim()}
        >
          提交
        </Button>

        {!showSecret && secret && (
          <div className="submit-hint" onClick={() => setShowSecret(true)}>
            修改密钥
          </div>
        )}
      </div>

      <div className="submit-steps">
        <div className="step">
          <span className="step-num">1</span>
          <span className="step-text">QQ群里长按消息复制</span>
        </div>
        <div className="step-arrow">→</div>
        <div className="step">
          <span className="step-num">2</span>
          <span className="step-text">粘贴到上方文本框</span>
        </div>
        <div className="step-arrow">→</div>
        <div className="step">
          <span className="step-num">3</span>
          <span className="step-text">点击提交</span>
        </div>
      </div>
    </div>
  );
};

export default SubmitPage;
