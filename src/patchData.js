/**
 * setAttribute 方法允许我们为 DOM 元素设置自定义属性（不会初始化同名的 property）。
 * 另外该方法也允许我们为 DOM 元素设置标准属性的值，所以我们可不可以总是使用 setAttribute 设置全部的 DOM 属性呢？答案是：不行
 * checkboxEl.setAttribute('checked', false)
 * // 等价于
 * checkboxEl.setAttribute('checked', 'false')
 * 这就指引我们有些属性不能通过 setAttribute 设置，而是应该直接通过 DOM 元素设置：el.checked = true。
 * 好在这样的属性不多，我们可以列举出来：value、checked、selected、muted。
 * 除此之外还有一些属性也需要使用 Property 的方式设置到 DOM 元素上，例如 innerHTML 和 textContent 等等
 */
/**
 * 正则 domPropsRE 除了用来匹配我们前面说过的固定的几个属性之外，它还能匹配那些拥有大写字母的属性，这是为了匹配诸如 innerHTML、textContent 等属性设计的，
 * 同时这也顺便实现了一个特性，即拥有大写字母的属性我们都会采用 el[key] = xxx 的方式将其添加到 DOM 元素上
 */
const domPropsRE = /\[A-Z]|^(?:value|checked|selected|muted)$/;
/**
 * 遍历新的 VNodeData，将旧值和新值都传递给 patchData 函数，并由 patchData 函数负责更新数据；
 * 同时也需要遍历旧的 VNodeData，将已经不存在于新的 VNodeData 中的数据从元素上移除
 */
export function patchData(el, key, prevValue, nextValue) {
	switch (key) {
		case 'style':
			for (let k in nextValue) {
				el.style[k] = nextValue[k];
			}
			for (let k in prevValue) {
				if (!nextValue.hasOwnProperty(k)) {
					el.style[k] = '';
				}
			}
			break;
		case 'class':
			el.className = nextValue;
			break;
		default:
			if (key[0] === 'o' && key[1] === 'n') {
				// 事件
				// 先移除旧事件
				if (prevValue) {
					el.removeEventListener(key.slice(2), prevValue);
        }
        if (nextValue) {
          // 添加新事件
          el.addEventListener(key.slice(2), nextValue);
        }
			} else if (domPropsRE.test(key)) {
				// 按 DOM Prop 处理
				el[key] = nextValue;
			} else {
				// 按 Attr 处理
				el.setAttribute(key, nextValue);
			}
			break;
	}
}
