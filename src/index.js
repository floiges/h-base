import { h, Fragment, Portal } from './h';
import { Component } from './component';

// VNode 创建测试

/**
 * <template>
    <div>
      <span></span>
    </div>
  </template>
 */
const elementVNode = h('div', null, h('span'));
console.log(elementVNode);

/**
 * <template>
    <div>我是文本</div>
  </template>
*/
const elementWithTextVNode = h('div', null, '我是文本');
console.log(elementWithTextVNode);

/**
 * Fragment
 * <template>
    <td></td>
    <td></td>
  </template>
 */
const fragmentVNode = h(Fragment, null, [h('td'), h('td')]);
console.log(fragmentVNode);

/**
 * Portal
 * 将内容渲染到 id="box" 的元素下
 * 类型为 Portal 的 VNode 其 tag 属性值等于 data.target
 * <template>
    <Portal target="#box">
      <h1></h1>
    </Portal>
  </template>
 */
const portalVNode = h(
	Portal,
	{
		target: '#box',
	},
	h('h1'),
);
console.log(portalVNode);

/**
 * <template>
    <MyFunctionalComponent>
      <div></div>
    </MyFunctionalComponent>
  </template>
 */
// 函数式组件
function MyFunctionalComponent() {}
// 传递给 h 函数的第一个参数就是组件函数本身
const functionalComponentVNode = h(MyFunctionalComponent, null, h('div'));
console.log(functionalComponentVNode);

/**
 * 渲染有状态组件
 * 只有当组件的原型上拥有 render 函数时才会把它当作有状态组件
 */
class MyStatefulComponent extends Component {}
const statefulComponentVNode = h(MyStatefulComponent, null, h('div'));
console.log(statefulComponentVNode);