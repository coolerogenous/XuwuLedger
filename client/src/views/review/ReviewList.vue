<template>
  <div>
    <div class="page-header">
      <h2>审核中心</h2>
    </div>

    <el-tabs v-model="activeTab" @tab-change="fetchData">
      <el-tab-pane label="待审核订单" name="orders" />
      <el-tab-pane label="待审核资料" name="materials" />
    </el-tabs>

    <!-- 待审核订单 -->
    <el-card v-if="activeTab === 'orders'">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="150">
          <template #default="{ row }">
            <router-link :to="`/orders/${row.id}`" style="color: var(--primary-light);">{{ row.order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="client_name" label="客户" min-width="140" />
        <el-table-column prop="product_name" label="产品" min-width="140" />
        <el-table-column prop="pre_transaction_amount" label="预刷流水" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.pre_transaction_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="service_fee_rate" label="服务费比例" width="100">
          <template #default="{ row }">{{ ((row.service_fee_rate || 0) * 100).toFixed(2) }}%</template>
        </el-table-column>
        <el-table-column prop="retention_profit_rate" label="留利比例" width="100">
          <template #default="{ row }">{{ ((row.retention_profit_rate || 0) * 100).toFixed(2) }}%</template>
        </el-table-column>
        <el-table-column prop="sales_name" label="销售" width="90" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" @click="reviewOrder(row.id, 'approve')">通过</el-button>
            <el-button link type="danger" @click="openReject(row.id)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 待审核资料 -->
    <el-card v-if="activeTab === 'materials'">
      <el-table :data="materials" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="150" />
        <el-table-column prop="client_name" label="客户" width="140" />
        <el-table-column prop="file_name" label="文件名" min-width="200" />
        <el-table-column prop="uploader_name" label="上传人" width="100" />
        <el-table-column prop="created_at" label="上传时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="downloadFile(row)">查看</el-button>
            <el-button link type="success" @click="reviewMaterial(row.id, 'approved')">通过</el-button>
            <el-button link type="danger" @click="openMaterialReject(row.id)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="materialPage" :page-size="20" :total="materialTotal" layout="total, prev, pager, next" @current-change="fetchMaterials" />
      </div>
    </el-card>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="showReject" title="驳回" width="420">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写驳回原因（必填）" />
      <template #footer>
        <el-button @click="showReject = false">取消</el-button>
        <el-button type="danger" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const activeTab = ref('orders')
const loading = ref(false)
const orders = ref([])
const materials = ref([])
const materialPage = ref(1)
const materialTotal = ref(0)
const showReject = ref(false)
const rejectReason = ref('')
const rejectTarget = ref({ type: '', id: null })

async function fetchData() {
  if (activeTab.value === 'orders') fetchOrders()
  else fetchMaterials()
}

async function fetchOrders() {
  loading.value = true
  try {
    const res = await api.get('/orders', { params: { status: 'ops_reviewing', pageSize: 100 } })
    orders.value = res.data.list
  } finally { loading.value = false }
}

async function fetchMaterials() {
  loading.value = true
  try {
    const res = await api.get('/materials/pending', { params: { page: materialPage.value, pageSize: 20 } })
    materials.value = res.data.list
    materialTotal.value = res.data.total
  } finally { loading.value = false }
}

async function reviewOrder(id, action) {
  await api.post(`/orders/${id}/review`, { action })
  ElMessage.success('审核通过')
  fetchOrders()
}

function openReject(id) {
  rejectTarget.value = { type: 'order', id }
  rejectReason.value = ''
  showReject.value = true
}

function openMaterialReject(id) {
  rejectTarget.value = { type: 'material', id }
  rejectReason.value = ''
  showReject.value = true
}

async function doReject() {
  if (!rejectReason.value) return ElMessage.warning('请填写驳回原因')
  if (rejectTarget.value.type === 'order') {
    await api.post(`/orders/${rejectTarget.value.id}/review`, { action: 'reject', reject_reason: rejectReason.value })
  } else {
    await api.post(`/materials/${rejectTarget.value.id}/review`, { result: 'rejected', reject_reason: rejectReason.value })
  }
  ElMessage.success('已驳回')
  showReject.value = false
  fetchData()
}

async function reviewMaterial(id, result) {
  await api.post(`/materials/${id}/review`, { result })
  ElMessage.success('审核通过')
  fetchMaterials()
}

function downloadFile(row) {
  window.open(row.file_url, '_blank')
}

onMounted(fetchData)
</script>
