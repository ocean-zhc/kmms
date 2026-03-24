import React, { useEffect, useState } from 'react';
import { Card, Spin, Empty, Typography, DatePicker, List, Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import MenuGrid from '@/components/MenuGrid';
import AiSummary from '@/components/AiSummary';
import NutritionAnalysis from '@/components/NutritionAnalysis';
import { getPublicWeeks, getPublicWeekDetail, getPublicDishes } from '@/services/api';
import './history.less';

dayjs.extend(isoWeek);

const { Title } = Typography;

const HistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [pickedWeekInfo, setPickedWeekInfo] = useState<{ year: number; week: number; weekStart: string; weekEnd: string; notFound?: boolean } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dishes, setDishes] = useState<any[]>([]);

  useEffect(() => {
    fetchWeeks(1);
    getPublicDishes().then((res) => {
      if (res.code === 0) setDishes(res.data || []);
    }).catch(() => {});
  }, []);

  const fetchWeeks = async (p: number) => {
    setLoading(true);
    try {
      const res = await getPublicWeeks({ page: p, pageSize: 6 });
      if (res.code === 0) {
        setWeeks(res.data.list || []);
        setTotal(res.data.total || 0);
        setPage(p);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWeek = async (week: any) => {
    setDetailLoading(true);
    try {
      const res = await getPublicWeekDetail(week.id);
      if (res.code === 0) {
        setSelectedWeek(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  /** 通过日历选择日期，自动找到该周的已发布食谱 */
  const handleDateSelect = (date: dayjs.Dayjs | null) => {
    if (!date) {
      setPickedWeekInfo(null);
      return;
    }
    const year = date.isoWeekYear();
    const weekNum = date.isoWeek();
    const weekStart = date.isoWeekday(1).format('YYYY-MM-DD');
    const weekEnd = date.isoWeekday(7).format('YYYY-MM-DD');

    // 在已加载的周列表中查找匹配的
    const found = weeks.find(
      (w) => w.year === year && w.week_number === weekNum,
    );
    if (found) {
      setPickedWeekInfo({ year, week: weekNum, weekStart, weekEnd });
      handleSelectWeek(found);
    } else {
      setPickedWeekInfo({ year, week: weekNum, weekStart, weekEnd, notFound: true });
      setSelectedWeek(null);
    }
  };

  return (
    <div className="history-page">
      <Title level={3} className="page-title">
        <CalendarOutlined /> 历史食谱
      </Title>

      {/* 日历选择 */}
      <Card className="date-picker-card" style={{ marginBottom: 16 }}>
        <div className="date-picker-row">
          <span className="picker-label">选择日期查看该周食谱：</span>
          <DatePicker
            onChange={handleDateSelect}
            placeholder="点击选择日期"
            style={{ width: 200 }}
          />
        </div>
        {pickedWeekInfo && (
          <div
            className="picked-week-info"
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 6,
              background: pickedWeekInfo.notFound ? '#fff2f0' : '#f6ffed',
              border: `1px solid ${pickedWeekInfo.notFound ? '#ffccc7' : '#b7eb8f'}`,
            }}
          >
            <span style={{ fontWeight: 600, color: pickedWeekInfo.notFound ? '#ff4d4f' : '#52c41a' }}>
              {pickedWeekInfo.year}年 第{pickedWeekInfo.week}周
            </span>
            <span style={{ marginLeft: 12, color: '#666' }}>
              {pickedWeekInfo.weekStart}（周一）~ {pickedWeekInfo.weekEnd}（周日）
            </span>
            {pickedWeekInfo.notFound && (
              <span style={{ marginLeft: 12, color: '#ff4d4f' }}>
                该周食谱未发布
              </span>
            )}
          </div>
        )}
      </Card>

      {/* 食谱详情 */}
      {detailLoading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      )}

      {selectedWeek && !detailLoading && (
        <div className="detail-section">
          <h3 className="detail-title">
            {selectedWeek.year}年 第{selectedWeek.week_number}周
          </h3>
          <MenuGrid
            items={selectedWeek.items || []}
            weekStart={selectedWeek.week_start}
            weekEnd={selectedWeek.week_end}
            dishes={dishes}
          />
          <div className="analysis-grid">
            <NutritionAnalysis weekId={selectedWeek.id} />
            <AiSummary weekId={selectedWeek.id} />
          </div>
        </div>
      )}

      {/* 周列表 */}
      <Card title="全部已发布食谱" className="week-list-card">
        {loading ? (
          <Spin />
        ) : weeks.length === 0 ? (
          <Empty description="暂无历史食谱" />
        ) : (
          <List
            grid={{ gutter: 12, xs: 2, sm: 3, md: 4, lg: 6 }}
            dataSource={weeks}
            pagination={{
              total,
              current: page,
              pageSize: 6,
              showSizeChanger: true,
              pageSizeOptions: ['6', '12', '24'],
              onChange: (p) => fetchWeeks(p),
              size: 'small',
              showTotal: (t) => `共 ${t} 周`,
            }}
            renderItem={(week: any) => (
              <List.Item>
                <Card
                  hoverable
                  size="small"
                  className={`week-card ${selectedWeek?.id === week.id ? 'selected' : ''}`}
                  onClick={() => handleSelectWeek(week)}
                >
                  <div className="week-card-content">
                    <div className="week-label">第{week.week_number}周</div>
                    <div className="week-date">
                      {week.week_start} ~ {week.week_end}
                    </div>
                    <Tag
                      color={
                        week.status === 'published' ? 'green' : 'default'
                      }
                    >
                      {week.status === 'published' ? '已发布' : '归档'}
                    </Tag>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default HistoryPage;
