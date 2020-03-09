/**
 * 基础组件，提供 render 函数
 * 在设计有状态组件时，我们会设计一个基础组件，所有组件都会继承基础组件
 * 并且基础组件拥有用来报告错误信息的 render 函数
 */
export class Component {
  render() {
    throw '组件缺少 render 函数';
  }
}