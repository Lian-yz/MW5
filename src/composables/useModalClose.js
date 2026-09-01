import { ref } from 'vue'

/**
 * 弹窗关闭逻辑：单击空白不关闭，双击空白或点击 ✕ 才关闭
 * 用法：
 *   const { handleOverlayClick, closeBtnClick } = useModalClose(() => { show = false })
 *   模板: <div class="modal-overlay" @click.self="handleOverlayClick">
 *           <div class="modal-content">
 *             <button class="modal-close-x" @click="closeBtnClick">✕</button>
 *             ...
 *           </div>
 *         </div>
 */
export function useModalClose(closeFn) {
  const clickCount = ref(0)
  let timer = null
  let resetTimer = null

  function handleOverlayClick() {
    clickCount.value++
    if (clickCount.value >= 2) {
      // 双击 → 关闭
      clearTimeout(timer)
      clearTimeout(resetTimer)
      clickCount.value = 0
      closeFn()
    } else {
      // 首次单击 → 设置超时重置
      clearTimeout(timer)
      timer = setTimeout(() => {
        clickCount.value = 0
      }, 600)
    }
  }

  function closeBtnClick() {
    clearTimeout(timer)
    clearTimeout(resetTimer)
    clickCount.value = 0
    closeFn()
  }

  return { handleOverlayClick, closeBtnClick }
}
