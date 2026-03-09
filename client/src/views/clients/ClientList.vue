<template>
  <div>
    <div class="page-header">
      <h2>客户管理</h2>
      <el-button type="primary" @click="showCreate = true" v-if="['admin','ops','sales'].includes(userStore.role)">
        <el-icon><Plus /></el-icon> 新建客户
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索企业名/联系人/电话" clearable style="width: 280px" @clear="fetchList" @keyup.enter="fetchList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button @click="fetchList">搜索</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="company_name" label="企业名称" min-width="180">
          <template #default="{ row }">
            <router-link :to="`/clients/${row.id}`" style="color: var(--primary-light);">{{ row.company_name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="contact_name" label="联系人" width="120" />
        <el-table-column prop="contact_phone" label="联系电话" width="140" />
        <el-table-column prop="sales_name" label="绑定销售" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/clients/${row.id}`)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="showCreate" :title="editId ? '编辑客户' : '新建客户'" width="500">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="企业名称" prop="company_name">
          <el-input v-model="form.company_name" placeholder="请输入企业名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact_name" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="资质信息">
          <el-input v-model="form.qualification" type="textarea" :rows="3" placeholder="请输入资质信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">{{ editId ? '更新' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import api from '../../api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const list = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const showCreate = ref(false)
const submitting = ref(false)
const editId = ref(null)
const formRef = ref(null)

const form = reactive({ company_name: '', contact_name: '', contact_phone: '', qualification: '' })
const rules = { company_name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }] }

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/clients', { params: { keyword: keyword.value, page: page.value, pageSize } })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

function openEdit(row) {
  editId.value = row.id
  Object.assign(form, { company_name: row.company_name, contact_name: row.contact_name, contact_phone: row.contact_phone, qualification: row.qualification || '' })
  showCreate.value = true
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (editId.value) {
      await api.put(`/clients/${editId.value}`, form)
      ElMessage.success('更新成功')
    } else {
      await api.post('/clients', form)
      ElMessage.success('创建成功')
    }
    showCreate.value = false
    editId.value = null
    Object.assign(form, { company_name: '', contact_name: '', contact_phone: '', qualification: '' })
    fetchList()
  } finally { submitting.value = false }
}

onMounted(fetchList)
</script>
