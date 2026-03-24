import React from 'react';
import { Select, Card } from 'antd';
import './MenuGrid.less';

const WEEKDAYS = [
  { label: '星期一', icon: '🌱', short: '周一' },
  { label: '星期二', icon: '🌿', short: '周二' },
  { label: '星期三', icon: '🍀', short: '周三' },
  { label: '星期四', icon: '🌻', short: '周四' },
  { label: '星期五', icon: '🌈', short: '周五' },
  { label: '星期六', icon: '⭐', short: '周六' },
  { label: '星期日', icon: '🌞', short: '周日' },
];

const FOOD_EMOJI_RULES: [RegExp, string][] = [
  [/饭|米/, '🍚'],
  [/面|粉|饼/, '🍜'],
  [/汤|羹/, '🍲'],
  [/粥/, '🥣'],
  [/包|馒|卷|饺|馄/, '🥟'],
  [/鱼|虾|蟹/, '🐟'],
  [/鸡/, '🍗'],
  [/肉|排骨|牛|猪|鸭/, '🥩'],
  [/蛋|卵/, '🥚'],
  [/豆|腐/, '🫘'],
  [/奶|酸奶|牛乳/, '🥛'],
  [/果|苹|梨|蕉|橙|莓|桃|瓜(?!肉|鸡|骨)/, '🍎'],
  [/菜|菠|芹|萝卜|白菜|青|蔬|藕|笋|茄|椒|花菜|木耳|香菇|蘑/, '🥬'],
  [/糕|饼干|面包|蛋糕|琪玛/, '🍰'],
  [/玉米/, '🌽'],
];

const getDishEmoji = (name: string): string => {
  for (const [pattern, emoji] of FOOD_EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return '🍽';
};
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

  const contentToValues = (content: string): string[] => {
    if (!content) return [];
    if (content.includes(SEPARATOR)) {
      return content.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
    }
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
    return [content];
  };

  const valuesToContent = (values: string[]): string => {
    return values.join(SEPARATOR);
  };

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
          <div key={i} className="dish-item">
            <span className="dish-emoji">{getDishEmoji(name)}</span>
            <span className="dish-name">{name}</span>
          </div>
        ))}
      </div>
    );
  };

  // 计算今天是本周第几天（ISO: 周一=1）
  const getTodayWeekday = (): number => {
    if (!weekStart || !weekEnd) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd);
    end.setHours(0, 0, 0, 0);
    if (today < start || today > end) return 0;
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return diff + 1; // 1=周一 ... 7=周日
  };

  // Bento card layout for read-only (public pages)
  if (!editable) {
    const todayWeekday = getTodayWeekday();
    return (
      <div className="menu-grid-wrapper">
        {dateRange && <div className="menu-grid-date">{dateRange}</div>}
        <div className="bento-grid">
          {WEEKDAYS.map((day, idx) => {
            const weekday = idx + 1;
            const lunchContent = getContent(weekday, 'lunch');
            const snackContent = getContent(weekday, 'snack');
            if (!lunchContent && !snackContent) return null;
            const isToday = weekday === todayWeekday;
            return (
              <div
                key={weekday}
                className={`bento-card glass-card${isToday ? ' bento-today' : ''}`}
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <div className="bento-header">
                  <span className="bento-icon">{day.icon}</span>
                  <span className="bento-day">{day.label}</span>
                  {isToday && <span className="today-badge">今日食谱</span>}
                </div>
                <div className="bento-meals">
                  {MEAL_TYPES.map((meal) => {
                    const content = getContent(weekday, meal.key);
                    if (!content) return null;
                    return (
                      <div key={meal.key} className={`bento-meal-group ${meal.key}`}>
                        <div className="bento-meal-label">
                          <span className="meal-dot" style={{ background: meal.borderColor }} />
                          {meal.label}
                        </div>
                        <div className="bento-meal-items">
                          {renderReadCell(content)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile cards */}
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
                  {renderReadCell(getContent(weekday, meal.key))}
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Editable table layout (admin)
  return (
    <div className="menu-grid-wrapper">
      {dateRange && <div className="menu-grid-date">{dateRange}</div>}
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
                    {renderEditCell(weekday, meal.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile editable */}
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
                {renderEditCell(weekday, meal.key)}
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuGrid;
