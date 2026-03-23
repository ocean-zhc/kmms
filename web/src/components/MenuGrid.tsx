import React from 'react';
import { Select, Card, Tag } from 'antd';
import './MenuGrid.less';

const WEEKDAYS = [
  { label: '星期一', icon: '🌱' },
  { label: '星期二', icon: '🌿' },
  { label: '星期三', icon: '🍀' },
  { label: '星期四', icon: '🌻' },
  { label: '星期五', icon: '🌈' },
  { label: '星期六', icon: '⭐' },
  { label: '星期日', icon: '🌞' },
];
const MEAL_TYPES = [
  { key: 'lunch', label: '营养午餐', icon: '🍚', color: '#fff7e6', borderColor: '#ffa940' },
  { key: 'snack', label: '快乐午点', icon: '🧁', color: '#f0f5ff', borderColor: '#597ef7' },
];

interface Dish {
  id: number;
  name: string;
  meal_type: string;
}

interface MenuItem {
  weekday: number;
  meal_type: string;
  content: string;
}

interface MenuGridProps {
  items: MenuItem[];
  editable?: boolean;
  onChange?: (weekday: number, mealType: string, content: string) => void;
  weekStart?: string;
  weekEnd?: string;
  /** 菜谱库，编辑模式下用于选择 */
  dishes?: Dish[];
}

const MenuGrid: React.FC<MenuGridProps> = ({
  items,
  editable = false,
  onChange,
  weekStart,
  weekEnd,
  dishes = [],
}) => {
  const getContent = (weekday: number, mealType: string): string => {
    const item = items.find(
      (i) => i.weekday === weekday && i.meal_type === mealType,
    );
    return item?.content || '';
  };

  const SEPARATOR = '|||';

  /** 将 content 字符串拆成菜名数组 */
  const contentToValues = (content: string): string[] => {
    if (!content) return [];
    // 优先按 ||| 分割（新格式）
    if (content.includes(SEPARATOR)) {
      return content.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
    }
    // 兼容旧数据：按菜谱库匹配拆分
    if (dishes.length > 0) {
      const names = dishes.map((d) => d.name).sort((a, b) => b.length - a.length);
      const found: string[] = [];
      let remaining = content;
      for (const name of names) {
        if (remaining.includes(name)) {
          found.push(name);
          remaining = remaining.replace(name, '');
        }
      }
      if (found.length > 0) return found;
    }
    // 最终兜底：整段作为一项
    return [content];
  };

  /** 将选中的菜名数组拼成 content 字符串 */
  const valuesToContent = (values: string[]): string => {
    return values.join(SEPARATOR);
  };

  /** 获取对应 meal_type 的菜品选项 */
  const getDishOptions = (mealType: string) => {
    return dishes
      .filter((d) => d.meal_type === mealType)
      .map((d) => ({ label: d.name, value: d.name }));
  };

  const dateRange = weekStart && weekEnd ? `${weekStart} ~ ${weekEnd}` : '';

  const renderEditCell = (weekday: number, mealKey: string) => {
    const content = getContent(weekday, mealKey);
    const selected = contentToValues(content);
    const options = getDishOptions(mealKey);

    return (
      <Select
        mode="multiple"
        value={selected}
        onChange={(values: string[]) =>
          onChange?.(weekday, mealKey, valuesToContent(values))
        }
        options={options}
        placeholder="请选择菜品"
        style={{ width: '100%' }}
        maxTagCount={undefined}
        allowClear
        showSearch
        filterOption={(input, option) =>
          (option?.label as string)?.includes(input)
        }
      />
    );
  };

  const renderReadCell = (content: string) => {
    if (!content) return <span className="empty-text">暂未配置</span>;
    const names = contentToValues(content);
    return (
      <div className="meal-content">
        {names.map((name, i) => (
          <div key={i} className="dish-item">{name}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="menu-grid-wrapper">
      {dateRange && <div className="menu-grid-date">{dateRange}</div>}

      {/* PC端表格布局 */}
      <div className="menu-grid-table">
        <table>
          <thead>
            <tr>
              <th className="label-cell corner-cell">
                <span className="corner-icon">🍽</span>
                <span className="corner-text">餐次</span>
              </th>
              {WEEKDAYS.map((day, idx) => (
                <th key={idx} className="day-header">
                  <span className="day-icon">{day.icon}</span>
                  <span className="day-text">{day.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map((meal) => (
              <tr key={meal.key}>
                <td
                  className="meal-label"
                  style={{
                    backgroundColor: meal.color,
                    borderLeftColor: meal.borderColor,
                  }}
                >
                  <span className="meal-icon">{meal.icon}</span>
                  <span className="meal-text">{meal.label}</span>
                </td>
                {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
                  <td key={weekday} className="meal-cell">
                    {editable
                      ? renderEditCell(weekday, meal.key)
                      : renderReadCell(getContent(weekday, meal.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片布局 */}
      <div className="menu-grid-mobile">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <Card
            key={weekday}
            title={<span>{WEEKDAYS[weekday - 1].icon} {WEEKDAYS[weekday - 1].label}</span>}
            size="small"
            className="day-card"
          >
            {MEAL_TYPES.map((meal) => (
              <div key={meal.key} className="mobile-meal-section">
                <div
                  className="mobile-meal-label"
                  style={{
                    backgroundColor: meal.color,
                    borderLeftColor: meal.borderColor,
                  }}
                >
                  {meal.icon} {meal.label}
                </div>
                {editable
                  ? renderEditCell(weekday, meal.key)
                  : renderReadCell(getContent(weekday, meal.key))}
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuGrid;
