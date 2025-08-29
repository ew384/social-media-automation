<template>
  <div v-if="visible" class="emoji-picker-popup" :style="popupStyle">
    <!-- 🔥 直接显示所有emoji，不分类 -->
    <div class="emoji-picker-content">
      <div class="emoji-grid">
        <button
          v-for="emoji in allEmojis"
          :key="emoji"
          class="emoji-item"
          @click="handleEmojiClick(emoji)"
          :title="emoji"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { EMOJI_CATEGORIES } from "@/utils/emoji";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  buttonRect: {
    type: Object,
    default: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  },
});

const emit = defineEmits(["close", "select"]);
const activeCategory = ref("常用");

// 🔥 显示所有emoji（不分页）
const displayEmojis = computed(() => {
  return EMOJI_CATEGORIES[activeCategory.value] || [];
});

const popupStyle = computed(() => {
  const rect = props.buttonRect;
  const popupWidth = 320;
  const popupHeight = 180;

  // 🔥 显示在按钮上方，右对齐到按钮
  let top = rect.top - 150;
  let left = rect.left + rect.width + 8;

  // 如果上方空间不够，显示在按钮下方
  if (top < 10) {
    top = rect.bottom + 8;
  }

  // 如果左侧超出屏幕，左对齐到按钮
  if (left < 10) {
    left = rect.left;
  }

  // 如果右侧超出屏幕，右对齐到屏幕边缘
  if (left + popupWidth > window.innerWidth - 10) {
    left = window.innerWidth - popupWidth - 10;
  }

  return {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    width: `${popupWidth}px`,
    zIndex: 1000,
  };
});

// 🔥 获取所有emoji，不分类
const allEmojis = computed(() => {
  return EMOJI_CATEGORIES;
});

const handleEmojiClick = (emoji) => {
  emit("select", emoji);
};
</script>

<style scoped>
.emoji-picker-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  border: 1px solid #e8e8e8;
  max-height: 300px;
  min-height: 200px;
}

/* 🔥 分类标签垂直布局 */
.emoji-picker-categories {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  padding: 8px 4px;
  gap: 4px;
  border-right: 1px solid #f0f0f0; /* 右边框 */
  background: #fafafa;
  overflow-y: auto; /* 垂直滚动 */
  min-width: 48px;
  max-width: 48px;
}

.category-tab {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-tab:hover {
  background: #f0f0f0;
}

.category-tab.active {
  background: #e6f7ff;
  transform: scale(1.1);
}

/* 🔥 emoji内容区占据剩余空间 */
.emoji-picker-content {
  flex: 1;
  overflow-y: auto; /* 垂直滚动 */
  padding: 8px;
  min-height: 150px;
  max-height: 280px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr); /* 减少列数以适应更窄的宽度 */
  gap: 4px;
}

.emoji-item {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 100%;
}

.emoji-item:hover {
  background: #f0f0f0;
  transform: scale(1.2);
}

/* 分类标签滚动条 */
.emoji-picker-categories::-webkit-scrollbar {
  width: 4px;
}

.emoji-picker-categories::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-picker-categories::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

/* emoji内容区滚动条 */
.emoji-picker-content::-webkit-scrollbar {
  width: 6px;
}

.emoji-picker-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.emoji-picker-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.emoji-picker-content::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
