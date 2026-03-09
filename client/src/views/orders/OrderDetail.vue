<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>业务单详情 - {{ order.order_no }}</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" v-if="canEdit" @click="showEdit = true">编辑</el-button>
        <el-button type="success" v-if="canSubmit" @click="handleSubmit">提交审核</el-button>
        <el-button type="success" v-if="canReview" @click="handleReview('approve')">审核通过</el-button>
        <el-button type="danger" v-if="canReview" @click="showReject = true">驳回</el-button>
      </div>
    </div>

    <!-- 状态步骤条 -->
    <el-card style="margin-bottom: 20px;">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="草稿" />
        <el-step title="运营审核" />
        <el-step title="待传资料" />
        <el-step title="链条方确认" />
        <el-step title="资金录入" />
        <el-step title="合同签署" />
        <el-step title="开票" />
        <el-step title="完结" />
      </el-steps>
    </el-card>

    <el-row :gutter="20">
      <!-- 订单信息 -->
      <el-col :span="12">
        <el-card>
          <template #header><span>订单信息</span></template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="订单编号">{{ order.order_no }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ order.client_name }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ order.contact_name }} / {{ order.contact_phone }}</el-descriptions-item>
            <el-descriptions-item label="产品">{{ order.product_name }}</el-descriptions-item>
            <el-descriptions-item label="预刷流水值">¥{{ Number(order.pre_transaction_amount || 0).toLocaleString() }}</el-descriptions-item>
            <el-descriptions-item label="服务费比例">{{ ((order.service_fee_rate || 0) * 100).toFixed(2) }}%</el-descriptions-item>
            <el-descriptions-item label="服务费金额">¥{{ Number(order.service_fee || 0).toLocaleString() }}</el-descriptions-item>
            <el-descriptions-item label="留利比例">{{ ((order.retention_profit_rate || 0) * 100).toFixed(2) }}%</el-descriptions-item>
            <el-descriptions-item label="留利金额">¥{{ Number(order.retention_profit || 0).toLocaleString() }}</el-descriptions-item>
            <el-descriptions-item label="销售">{{ order.sales_name }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(order.status)">{{ getStatusLabel(order.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="驳回原因" v-if="order.reject_reason">
              <span style="color: var(--danger);">{{ order.reject_reason }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 资料附件 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>资料附件</span>
              <el-upload :action="uploadUrl" :headers="uploadHeaders" :on-success="handleUploadSuccess" :show-file-list="false">
                <el-button type="primary" size="small"><el-icon><Upload /></el-icon> 上传资料</el-button>
              </el-upload>
            </div>
          </template>
          <el-table :data="order.materials || []" stripe size="small">
            <el-table-column prop="file_name" label="文件名" min-width="150" />
            <el-table-column prop="uploader_name" label="上传人" width="80" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" size="small">
                  {{ row.status === 'approved' ? '通过' : row.status === 'rejected' ? '驳回' : '待审' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button link type="primary" @click="downloadFile(row)">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 资金记录 & 合同发票 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>资金记录</span>
              <el-button type="primary" size="small" @click="showFund = true" v-if="['admin','ops','sales'].includes(userStore.role)">录入</el-button>
            </div>
          </template>
          <el-table :data="order.funds || []" stripe size="small">
            <el-table-column prop="record_type" label="类型" width="100">
              <template #default="{ row }">{{ fundTypeMap[row.record_type] || row.record_type }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ Number(row.amount).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="direction" label="方向" width="60">
              <template #default="{ row }">
                <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">{{ row.direction === 'in' ? '入' : '出' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="account_type" label="账户" width="60">
              <template #default="{ row }">{{ row.account_type === 'corporate' ? '对公' : '对私' }}</template>
            </el-table-column>
            <el-table-column prop="record_date" label="日期" width="110" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>合同 & 发票</span></template>
          <div v-if="(order.contracts || []).length" style="margin-bottom: 12px;">
            <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 6px;">合同</p>
            <el-tag v-for="c in order.contracts" :key="c.id" :type="c.status === 'signed' ? 'success' : 'warning'" style="margin-right: 6px;">
              {{ c.contract_type === 'partner' ? '链条方' : '客户' }}合同 - {{ c.status === 'signed' ? '已签' : '待签' }}
            </el-tag>
          </div>
          <div v-if="(order.invoices || []).length">
            <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 6px;">发票</p>
            <el-tag v-for="inv in order.invoices" :key="inv.id" style="margin-right: 6px;">
              {{ inv.invoice_type === 'input' ? '进项' : '销项' }} ¥{{ Number(inv.amount).toLocaleString() }}
            </el-tag>
          </div>
          <el-empty v-if="!(order.contracts || []).length && !(order.invoices || []).length" description="暂无" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="showReject" title="驳回订单" width="420">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写驳回原因（必填）" />
      <template #footer>
        <el-button @click="showReject = false">取消</el-button>
        <el-button type="danger" @click="handleReview('reject')">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showEdit" title="编辑订单" width="520">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="产品名称"><el-input v-model="editForm.product_name" /></el-form-item>
        <el-form-item label="预刷流水值"><el-input-number v-model="editForm.pre_transaction_amount" :min="0" :precision="2" style="width: 100%" /></el-form-item>
        <el-form-item label="服务费比例"><el-input-number v-model="editForm.service_fee_rate" :min="0" :max="1" :precision="4" :step="0.01" style="width: 100%" /></el-form-item>
        <el-form-item label="留利比例"><el-input-number v-model="editForm.retention_profit_rate" :min="0" :max="1" :precision="4" :step="0.01" style="width: 100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 资金录入弹窗 -->
    <el-dialog v-model="showFund" title="录入资金记录" width="520">
      <el-form :model="fundForm" label-width="80px">
        <el-form-item label="类型">
          <el-select v-model="fundForm.record_type" style="width: 100%">
            <el-option label="服务费" value="service_fee" />
            <el-option label="留利" value="retention" />
            <el-option label="付客户货款" value="payment_to_client" />
            <el-option label="付链条方留利" value="payment_to_partner" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额"><el-input-number v-model="fundForm.amount" :min="0" :precision="2" style="width: 100%" /></el-form-item>
        <el-form-item label="方向">
          <el-radio-group v-model="fundForm.direction">
            <el-radio value="in">入账</el-radio>
            <el-radio value="out">出账</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="账户">
          <el-radio-group v-model="fundForm.account_type">
            <el-radio value="corporate">对公</el-radio>
            <el-radio value="personal">对私</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="fundForm.record_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="fundForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFund = false">取消</el-button>
        <el-button type="primary" @click="handleFund">录入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import api from '../../api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
const order = ref({})
const showReject = ref(false)
const showEdit = ref(false)
const showFund = ref(false)
const rejectReason = ref('')

const statusMap = { draft: '草稿', pending_material: '待传资料', ops_reviewing: '运营审核中', partner_confirming: '链条方确认中', fund_recording: '资金录入', contract_signing: '合同签署中', invoicing: '开票中', completed: '已完结', rejected: '已驳回' }
const statusTypeMap = { draft: 'info', pending_material: 'warning', ops_reviewing: '', partner_confirming: '', fund_recording: '', contract_signing: 'warning', invoicing: '', completed: 'success', rejected: 'danger' }
const fundTypeMap = { service_fee: '服务费', retention: '留利', payment_to_client: '付客户', payment_to_partner: '付链条方' }
const statusOrder = ['draft', 'ops_reviewing', 'pending_material', 'partner_confirming', 'fund_recording', 'contract_signing', 'invoicing', 'completed']

function getStatusLabel(s) { return statusMap[s] || s }
function getStatusType(s) { return statusTypeMap[s] || '' }

const currentStep = computed(() => {
  const idx = statusOrder.indexOf(order.value.status)
  return idx >= 0 ? idx : 0
})

const canEdit = computed(() => ['draft', 'rejected'].includes(order.value.status) && ['admin', 'ops', 'sales'].includes(userStore.role))
const canSubmit = computed(() => ['draft', 'rejected'].includes(order.value.status) && ['admin', 'ops', 'sales'].includes(userStore.role))
const canReview = computed(() => order.value.status === 'ops_reviewing' && ['admin', 'ops'].includes(userStore.role))

const editForm = reactive({ product_name: '', pre_transaction_amount: 0, service_fee_rate: 0, retention_profit_rate: 0, remark: '' })
const fundForm = reactive({ record_type: 'service_fee', amount: 0, direction: 'in', account_type: 'corporate', record_date: '', remark: '' })

const uploadUrl = computed(() => `/api/orders/${route.params.id}/materials`)
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get(`/orders/${route.params.id}`)
    order.value = res.data
    Object.assign(editForm, {
      product_name: res.data.product_name,
      pre_transaction_amount: parseFloat(res.data.pre_transaction_amount) || 0,
      service_fee_rate: parseFloat(res.data.service_fee_rate) || 0,
      retention_profit_rate: parseFloat(res.data.retention_profit_rate) || 0,
      remark: res.data.remark || ''
    })
  } finally { loading.value = false }
}

async function handleSubmit() {
  await api.post(`/orders/${route.params.id}/submit`)
  ElMessage.success('已提交审核')
  fetchDetail()
}

async function handleReview(action) {
  if (action === 'reject' && !rejectReason.value) {
    return ElMessage.warning('请填写驳回原因')
  }
  await api.post(`/orders/${route.params.id}/review`, { action, reject_reason: rejectReason.value })
  ElMessage.success(action === 'approve' ? '审核通过' : '已驳回')
  showReject.value = false
  rejectReason.value = ''
  fetchDetail()
}

async function handleUpdate() {
  await api.put(`/orders/${route.params.id}`, editForm)
  ElMessage.success('更新成功')
  showEdit.value = false
  fetchDetail()
}

async function handleFund() {
  await api.post(`/finance/orders/${route.params.id}/funds`, fundForm)
  ElMessage.success('资金记录已录入')
  showFund.value = false
  fetchDetail()
}

function handleUploadSuccess() {
  ElMessage.success('上传成功')
  fetchDetail()
}

function downloadFile(row) {
  window.open(row.file_url, '_blank')
}

onMounted(fetchDetail)
</script>
