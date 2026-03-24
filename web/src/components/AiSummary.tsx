import React, { useEffect, useState, useMemo } from 'react';
import { Card, Spin, Button, Typography } from 'antd';
import { RobotOutlined, ReloadOutlined } from '@ant-design/icons';
import { getAiSummary } from '@/services/api';
import './AiSummary.less';

const { Paragraph } = Typography;

const HIGHLIGHT_RULES: { pattern: RegExp; className: string }[] = [
  { pattern: /蛋白|蛋白质|优质蛋白/g, className: 'hl-protein' },
  { pattern: /碳水|主食|粗粮|杂粮|燕麦|黑米|玉米|黄米/g, className: 'hl-carbs' },
  { pattern: /脂肪|油脂/g, className: 'hl-fat' },
  { pattern: /维生素|维C|维A|叶酸/g, className: 'hl-vitamin' },
  { pattern: /纤维|膳食纤维/g, className: 'hl-fiber' },
  { pattern: /钙|铁|锌|矿物质|微量元素/g, className: 'hl-mineral' },
  { pattern: /蔬菜|深色蔬菜|绿叶|时蔬/g, className: 'hl-veg' },
  { pattern: /水果|苹果|香蕉/g, className: 'hl-fruit' },
  { pattern: /荤素搭配|营养均衡|搭配合理|营养全面|均衡/g, className: 'hl-balance' },
];

function highlightText(text: string): React.ReactNode[] {
  // Build a combined regex
  const allPatterns = HIGHLIGHT_RULES.map((r) => `(${r.pattern.source})`).join('|');
  const combined = new RegExp(allPatterns, 'g');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Find which group matched
    const matched = match[0];
    let cls = 'hl-balance';
    for (let i = 0; i < HIGHLIGHT_RULES.length; i++) {
      if (match[i + 1] !== undefined) {
        cls = HIGHLIGHT_RULES[i].className;
        break;
      }
    }
    parts.push(
      <span key={match.index} className={`ai-highlight ${cls}`}>{matched}</span>
    );
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

interface AiSummaryProps {
  weekId: number;
}

const AiSummary: React.FC<AiSummaryProps> = ({ weekId }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState('');

  useEffect(() => {
    if (weekId) fetchSummary();
  }, [weekId]);

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    setSummary('');
    try {
      const res = await getAiSummary(weekId);
      if (res.code === 0) {
        setSummary(res.data.summary);
        setCached(res.data.cached);
        setGeneratedAt(res.data.generated_at || '');
      } else {
        setError(res.message || 'AI总结不可用');
      }
    } catch (e) {
      setError('AI总结功能暂不可用');
    } finally {
      setLoading(false);
    }
  };

  const highlighted = useMemo(() => {
    if (!summary) return null;
    return highlightText(summary);
  }, [summary]);

  if (error) return null;

  return (
    <Card
      className="ai-summary-card"
      title={
        <span className="ai-title">
          <RobotOutlined /> AI 营养点评
        </span>
      }
      extra={
        !loading && summary ? (
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchSummary}
            className="refresh-btn"
          >
            刷新
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="ai-loading">
          <Spin />
          <span>AI正在分析本周食谱...</span>
        </div>
      ) : summary ? (
        <div className="ai-content">
          <Paragraph className="summary-text">{highlighted}</Paragraph>
          <div className="ai-footer">
            {cached && <span className="cache-tag">已缓存</span>}
            {generatedAt && (
              <span className="gen-time">生成于 {generatedAt.replace(/\.\d+$/, '')}</span>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
};

export default AiSummary;
