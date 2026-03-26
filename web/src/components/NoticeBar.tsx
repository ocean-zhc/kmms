import React, { useEffect, useState } from 'react';
import { SoundOutlined } from '@ant-design/icons';
import { getPublicNotices } from '@/services/api';
import './NoticeBar.less';

interface Notice {
  id: number;
  title: string;
  content: string;
}

const NoticeBar: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    getPublicNotices().then((res) => {
      if (res.code === 0 && res.data?.length) {
        setNotices(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % notices.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [notices.length]);

  if (!notices.length) return null;

  const notice = notices[current];

  return (
    <div className="notice-bar">
      <div className="notice-icon">
        <SoundOutlined />
      </div>
      <div className="notice-content">
        {notice.title && <span className="notice-title">{notice.title}</span>}
        <span className="notice-text">{notice.content}</span>
      </div>
      {notices.length > 1 && (
        <div className="notice-dots" role="tablist" aria-label="公告切换">
          {notices.map((n, i) => (
            <button
              key={i}
              className={`dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`第${i + 1}条公告`}
              aria-selected={i === current}
              role="tab"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeBar;
