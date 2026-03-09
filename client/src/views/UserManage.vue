<template>
  <div>
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon> 创建用户
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterRole" placeholder="角色" clearable style="width: 140px" @change="fetchList">
        <el-option label="管理员" value="admin" />
        <el-option label="运营" value="ops" />
        <el-option label="销售" value="sales" />
        <el-option label="客户" value="client" />
        <el-option label="链条方" value="partner" />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索用户名/姓名/手机号" clearable style="width: 280px" @keyup.enter="fetchList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button @click="fetchList">搜索</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="real_name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTypeMap[row.role] || ''" size="small">{{ roleMap[row.role] || row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>

    <!-- 创建用户弹窗 -->
    <el-dialog v-model="showCreate" title="创建用户" width="480">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.real_name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="运营" value="ops" />
            <el-option label="销售" value="sales" />
            <el-option label="客户" value="client" />
            <el-option label="链条方" value="partner" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const keyword = ref('')
const filterRole = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const showCreate = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const roleMap = { admin: '管理员', ops: '运营', sales: '销售', client: '客户', partner: '链条方' }
const roleTypeMap = { admin: 'danger', ops: '', sales: 'success', client: 'warning', partner: 'info' }

const form = reactive({ username: '', password: '', real_name: '', phone: '', role: 'sales' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/auth/users', { params: { role: filterRole.value, keyword: keyword.value, page: page.value, pageSize } })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function toggleStatus(row) {
  await api.put(`/auth/users/${row.id}/status`, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success('更新成功')
  fetchList()
}

async function handleCreate() {
  await formRef.value.validate()
  submitting.value = true
  try {
    await api.post('/auth/users', form)
    ElMessage.success('创建成功')
    showCreate.value = false
    Object.assign(form, { username: '', password: '', real_name: '', phone: '', role: 'sales' })
    fetchList()
  } finally { submitting.value = false }
}

onMounted(fetchList)
</script>
