<template>
  <div class="home">

    <div class="demo-section">
      <HelloWorld msg="Vue3 + Vite + Element Plus" />
    </div>
  </div>
</template>

<script setup>
import HelloWorld from '../components/HelloWorld.vue'
import { Lightning, Star, Setting } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.home {
  .welcome-section {
    text-align: center;
    margin-bottom: 3rem;
    
    h1 {
      color: #2c3e50;
      margin-bottom: 1rem;
      font-size: 2.5rem;
    }
    
    p {
      color: #7f8c8d;
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    
    .features {
      margin-top: 2rem;
      
      .feature-card {
        height: 200px;
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: bold;
          
          .el-icon {
            color: #409eff;
          }
        }
        
        p {
          color: #666;
          font-size: 1rem;
          line-height: 1.6;
        }
      }
    }
  }
  
  .demo-section {
    margin-top: 3rem;
  }
}
</style>