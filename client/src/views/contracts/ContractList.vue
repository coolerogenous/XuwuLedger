<template>
  <div>
    <div class="page-header">
      <h2>合同管理</h2>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="合同类型" clearable style="width: 140px" @change="fetchList">
        <el-option label="链条方合同" value="partner" />
        <el-option label="客户合同" value="client" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="合同状态" clearable style="width: 140px" @change="fetchList">
        <el-option label="待签" value="pending" />
        <el-option label="已签" value="signed" />
        <el-option label="已归档" value="archived" />
      </el-select>
      <el-button @click="fetchList">查询</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="150">
          <template #default="{ row }">
            <router-link :to="`/orders/${row.order_id}`" style="color: var(--primary-light);">{{ row.order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="client_name" label="客户" width="140" />
        <el-table-column prop="contract_type" label="合同类型" width="100">
          <template #default="{ row }">{{ row.contract_type === 'partner' ? '链条方' : '客户' }}</template>
        </el-table-column>
        <el-table-column prop="title" label="合同标题" min-width="180" />
        <el-table-column prop="contract_no" label="合同编号" width="140" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'signed' ? 'success' : row.status === 'archived' ? 'info' : 'warning'" size="small">
              {{ row.status === 'signed' ? '已签' : row.status === 'archived' ? '已归档' : '待签' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signed_at" label="签署时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" v-if="row.status === 'pending'" @click="updateStatus(row.id, 'signed')">标记签署</el-button>
            <el-button link type="info" v-if="row.status === 'signed'" @click="updateStatus(row.id, 'archived')">归档</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const filterType = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/contracts', { params: { contract_type: filterType.value, status: filterStatus.value, page: page.value, pageSize } })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function updateStatus(id, status) {
  await api.put(`/contracts/${id}`, { status })
  ElMessage.success('更新成功')
  fetchList()
}

onMounted(fetchList)
</script>
