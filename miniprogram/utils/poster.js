/**
 * 食谱海报绘制
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas宽度(逻辑像素)
 * @param {number} h - canvas高度(逻辑像素)
 * @param {object} data - { title, subtitle, meals: [{ label, emoji, dishes: string[] }] }
 */
function drawPoster(ctx, w, h, data) {
  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#f6ffed');
  bg.addColorStop(0.5, '#ffffff');
  bg.addColorStop(1, '#fffbe6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 装饰圆
  ctx.fillStyle = 'rgba(82, 196, 26, 0.06)';
  ctx.beginPath();
  ctx.arc(w - 40, 60, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250, 173, 20, 0.06)';
  ctx.beginPath();
  ctx.arc(40, h - 80, 100, 0, Math.PI * 2);
  ctx.fill();

  let y = 50;

  // 标题
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a3a2a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('🍱 ' + (data.title || '宝宝食谱'), w / 2, y);
  y += 40;

  // 副标题
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#8c8c8c';
  ctx.fillText(data.subtitle || '', w / 2, y);
  y += 50;

  // 分割线
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(w - 40, y);
  ctx.stroke();
  y += 30;

  // 餐次内容
  ctx.textAlign = 'left';
  (data.meals || []).forEach(meal => {
    // 餐次标签
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#52c41a';
    ctx.fillText(meal.emoji + ' ' + meal.label, 40, y);
    y += 34;

    // 菜品列表
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#333';
    const dishText = (meal.dishes || []).join('、');
    const lines = wrapText(ctx, dishText, w - 100);
    lines.forEach(line => {
      ctx.fillText(line, 56, y);
      y += 30;
    });
    y += 16;
  });

  // 底部
  y = Math.max(y + 20, h - 50);
  ctx.textAlign = 'center';
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#d9d9d9';
  ctx.fillText('用心呵护每一餐 ❤️', w / 2, h - 20);
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const test = current + text[i];
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = text[i];
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

module.exports = { drawPoster };
