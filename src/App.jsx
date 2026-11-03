import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const emptyProject = {
  title: '',
  description: '',
  tech_stack: '',
  category: 'Web',
  status: 'Tamamlandı',
  project_url: '',
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyProject)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tümü')

  // Oturum kontrolü
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) setAuthMessage(error.message)
      setUser(data?.session?.user ?? null)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setAuthReady(true)
        setShowLogin(false)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Projeleri herkes için yükle
  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('Projeler yüklenemedi: ' + error.message)
      setProjects([])
    } else {
      setProjects(data ?? [])
    }

    setLoading(false)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setAuthMessage(error.message)
    } else {
      setPassword('')
      setShowLogin(false)
    }

    setAuthLoading(false)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage('Çıkış yapılamadı: ' + error.message)
    } else {
      setMessage('')
      setAuthMessage('')
      setEmail('')
      setPassword('')
    }
  }

  function openNewProject() {
    setEditingId(null)
    setForm(emptyProject)
    setMessage('')
    setModalOpen(true)
  }

  function openEditProject(project) {
    setEditingId(project.id)
    setForm({
      title: project.title ?? '',
      description: project.description ?? '',
      tech_stack: Array.isArray(project.tech_stack)
        ? project.tech_stack.join(', ')
        : '',
      category: project.category ?? 'Web',
      status: project.status ?? 'Tamamlandı',
      project_url: project.project_url ?? '',
    })
    setMessage('')
    setModalOpen(true)
  }

  async function saveProject(event) {
    event.preventDefault()

    if (!user) {
      setMessage('Bu işlem için yönetici girişi gerekli.')
      return
    }

    if (!form.title.trim()) {
      setMessage('Lütfen proje adını yaz.')
      return
    }

    setSaving(true)
    setMessage('')

    const projectData = {
      title: form.title.trim(),
      description: form.description.trim(),
      tech_stack: form.tech_stack
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      category: form.category,
      status: form.status,
      project_url: form.project_url.trim(),
      user_id: user.id,
    }

    const result = editingId
      ? await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingId)
          .eq('user_id', user.id)
      : await supabase.from('projects').insert(projectData)

    if (result.error) {
      setMessage('Kaydedilemedi: ' + result.error.message)
    } else {
      setModalOpen(false)
      setForm(emptyProject)
      setEditingId(null)
      await loadProjects()
    }

    setSaving(false)
  }

  async function deleteProject(id) {
    if (!user || !window.confirm('Bu projeyi silmek istediğine emin misin?')) {
      return
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      setMessage('Proje silinemedi: ' + error.message)
    } else {
      setProjects((current) =>
        current.filter((project) => project.id !== id)
      )
    }
  }

  const filteredProjects = projects.filter((project) => {
    const techStack = Array.isArray(project.tech_stack)
      ? project.tech_stack
      : []

    const text = [
      project.title,
      project.description,
      project.category,
      ...techStack,
    ]
      .join(' ')
      .toLowerCase()

    return (
      text.includes(search.toLowerCase()) &&
      (filter === 'Tümü' || project.status === filter)
    )
  })

  const completedCount = projects.filter(
    (project) => project.status === 'Tamamlandı'
  ).length

  const inProgressCount = projects.filter(
    (project) => project.status === 'Devam Ediyor'
  ).length

  if (!authReady) {
    return (
      <div className="auth-loading">
        <div className="loader" />
        DevStudio hazırlanıyor...
      </div>
    )
  }

  return (
    <div className="app-shell">
      {user && (
        <aside className="sidebar">
          <a className="brand" href="#home">
            <span className="brand-mark">D</span>
            <span>
              DevStudio
              <small>PORTFÖY PANELİ</small>
            </span>
          </a>

          <div className="sidebar-label">MENÜ</div>
          <a className="nav-item active" href="#overview">
            <span>▦</span> Genel Bakış
          </a>
          <a className="nav-item" href="#projects">
            <span>◈</span> Projelerim
          </a>

          <div className="sidebar-bottom">
            <div className="profile-avatar">
              {(user.email?.[0] ?? 'D').toUpperCase()}
            </div>
            <div className="profile-details">
              <strong>Hesabım</strong>
              <span>{user.email}</span>
            </div>
            <span className="status-dot" />
          </div>
        </aside>
      )}

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {user ? 'YÖNETİM ALANI' : 'KİŞİSEL PORTFÖY'}
            </span>
            <div className="breadcrumb">
              DevStudio <span>/</span> {user ? 'Yönetim Paneli' : 'Projeler'}
            </div>
          </div>

          <div className="topbar-actions">
            {user ? (
              <>
                <button
                  className="secondary-button logout-button"
                  onClick={handleLogout}
                >
                  Çıkış Yap
                </button>
                <button
                  className="primary-button top-button"
                  onClick={openNewProject}
                >
                  <span>＋</span> Yeni Proje
                </button>
              </>
            ) : (
              <button
                className="primary-button top-button"
                onClick={() => {
                  setAuthMessage('')
                  setShowLogin(true)
                }}
              >
                Yönetici Girişi →
              </button>
            )}
          </div>
        </header>

        <div className="page-content" id="overview">
          <section className="hero-section">
            <div className="hero-copy">
              <span className="hero-tag">
                <span className="live-dot" />
                {user ? 'GELİŞTİRİCİ PANELİ' : 'KİŞİSEL PORTFÖYÜM'}
              </span>

              <h1>
                {user
                  ? 'Fikirlerini projelere dönüştür.'
                  : 'Projelerimi keşfet.'}
              </h1>

              <p>
                {user
                  ? 'Projelerini tek bir yerde düzenle, gelişimini takip et ve çalışmalarını sergile.'
                  : 'Geliştirdiğim projeleri, kullandığım teknolojileri ve çalışmalarımı burada inceleyebilirsin.'}
              </p>

              {user && (
                <button className="hero-button" onClick={openNewProject}>
                  İlk adımı at <span>→</span>
                </button>
              )}
            </div>

            <div className="hero-decoration" aria-hidden="true">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="code-card">
                <span className="code-dot">●</span>
                <span className="code-purple">const</span> future ={' '}
                <span className="code-green">'yours'</span>
                <br />
                <span className="code-muted">// keep building</span>
                <br />
                <span className="code-purple">return</span> future
                <span className="code-cyan">;</span>
              </div>
            </div>
          </section>

          <section className="stats-section">
            <div className="section-kicker">GENEL BAKIŞ</div>

            <div className="stats-grid">
              <article className="stat-card">
                <div className="stat-card-top">
                  <span className="stat-icon purple">◈</span>
                  <span className="stat-caption">TÜMÜ</span>
                </div>
                <div className="stat-number">{projects.length}</div>
                <div className="stat-label">Toplam Proje</div>
                <div className="stat-foot">Portföydeki projeler</div>
              </article>

              <article className="stat-card">
                <div className="stat-card-top">
                  <span className="stat-icon green">✓</span>
                  <span className="stat-caption">BİTTİ</span>
                </div>
                <div className="stat-number">{completedCount}</div>
                <div className="stat-label">Tamamlanan</div>
                <div className="stat-foot">Başarıyla tamamlananlar</div>
              </article>

              <article className="stat-card">
                <div className="stat-card-top">
                  <span className="stat-icon orange">↗️</span>
                  <span className="stat-caption">AKTİF</span>
                </div>
                <div className="stat-number">{inProgressCount}</div>
                <div className="stat-label">Devam Eden</div>
                <div className="stat-foot">Üzerinde çalışılanlar</div>
              </article>

              <article className="stat-card">
                <div className="stat-card-top">
                  <span className="stat-icon blue">⌘</span>
                  <span className="stat-caption">DURUM</span>
                </div>
                <div className="stat-number">Aktif</div>
                <div className="stat-label">Portföy</div>
                <div className="stat-foot">Projeler görüntülenebilir</div>
              </article>
            </div>
          </section>

          <section className="projects-section" id="projects">
            <div className="section-heading">
              <div>
                <div className="section-kicker">
                  {user ? 'YÖNETİM' : 'ÇALIŞMALARIM'}
                </div>
                <h2>
                  {user ? 'Projelerim' : 'Projeler'}
                  <span className="count-pill">{projects.length}</span>
                </h2>
                <p className="section-description">
                  {user
                    ? 'Çalışmalarını görüntüle ve yönet.'
                    : 'Projelerimi inceleyebilir, detaylarını görüntüleyebilirsin.'}
                </p>
              </div>

              {user && (
                <button className="secondary-button" onClick={openNewProject}>
                  ＋ Proje ekle
                </button>
              )}
            </div>

            <div className="project-toolbar">
              <label className="search-box">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Projelerde ara..."
                />
              </label>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option>Tümü</option>
                <option>Tamamlandı</option>
                <option>Devam Ediyor</option>
                <option>Planlandı</option>
              </select>
            </div>

            {message && !modalOpen && (
              <div className="notice">{message}</div>
            )}

            {loading ? (
              <div className="empty-state">
                <div className="loader" />
                Projeler yükleniyor...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◈</div>
                <h3>
                  {search || filter !== 'Tümü'
                    ? 'Sonuç bulunamadı'
                    : 'Henüz proje eklenmemiş'}
                </h3>
                <p>
                  {search || filter !== 'Tümü'
                    ? 'Arama veya filtre seçeneklerini değiştirmeyi dene.'
                    : user
                      ? 'İlk projenin bilgilerini ekleyerek portföyünü oluşturmaya başla.'
                      : 'Yeni projeler eklendiğinde burada görüntülenecek.'}
                </p>

                {user && !search && filter === 'Tümü' && (
                  <button className="primary-button" onClick={openNewProject}>
                    ＋ İlk projeni ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="project-grid">
                {filteredProjects.map((project) => (
                  <article className="project-card" key={project.id}>
                    <div className="project-card-top">
                      <span className="project-symbol">⌘</span>
                      <span
                        className={
                          'project-status ' +
                          (project.status === 'Tamamlandı'
                            ? 'status-complete'
                            : project.status === 'Devam Ediyor'
                              ? 'status-progress'
                              : 'status-planned')
                        }
                      >
                        {project.status}
                      </span>
                    </div>

                    <div className="project-info">
                      <span className="project-category">
                        {project.category || 'Diğer'}
                      </span>
                      <h3>{project.title}</h3>
                      <p className="project-description">
                        {project.description ||
                          'Bu proje için henüz açıklama eklenmemiş.'}
                      </p>
                    </div>

                    <div className="tech-list">
                      {(Array.isArray(project.tech_stack)
                        ? project.tech_stack
                        : []
                      ).map((tech, index) => (
                        <span key={`${tech}-${index}`}>{tech}</span>
                      ))}
                    </div>

                    <div className="project-card-footer">
                      {project.project_url ? (
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Projeyi görüntüle ↗️
                        </a>
                      ) : (
                        <span className="no-link">Bağlantı eklenmedi</span>
                      )}

                      {user && (
                        <div className="project-actions">
                          <button onClick={() => openEditProject(project)}>
                            Düzenle
                          </button>
                          <button onClick={() => deleteProject(project.id)}>
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>
              DevStudio <span className="footer-dot">•</span> Kendi yolunu kodla.
            </span>
            <span>Projelerim, benim hikâyem.</span>
          </footer>
        </div>
      </main>

      {/* Yönetici giriş penceresi */}
      {showLogin && !user && (
        <div className="modal-overlay">
          <section className="project-modal auth-login-modal">
            <div className="modal-header">
              <div>
                <span className="section-kicker">YÖNETİCİ ALANI</span>
                <h2>DevStudio'ya giriş yap</h2>
                <p>Projelerini yönetmek için hesabına giriş yap.</p>
              </div>
              <button
                className="close-button"
                onClick={() => setShowLogin(false)}
              >
                ×
              </button>
            </div>

            <form className="project-form" onSubmit={handleLogin}>
              <label className="form-field">
                E-posta adresin
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ornek@mail.com"
                />
              </label>

              <label className="form-field">
                Şifren
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Şifren"
                />
              </label>

              {authMessage && (
                <div className="notice" role="status">
                  {authMessage}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowLogin(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={authLoading}
                >
                  {authLoading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Proje ekleme ve düzenleme penceresi */}
      {modalOpen && user && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false)
            }
          }}
        >
          <section
            className="project-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">PORTFÖY YÖNETİMİ</span>
                <h2 id="modal-title">
                  {editingId ? 'Projeyi düzenle' : 'Yeni proje oluştur'}
                </h2>
                <p>Projenin temel bilgilerini gir.</p>
              </div>
              <button
                className="close-button"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="project-form" onSubmit={saveProject}>
              <label className="form-field">
                Proje adı *
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Örn. Kişisel web sitem"
                />
              </label>

              <label className="form-field">
                Açıklama
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Projen hakkında kısa bilgi..."
                />
              </label>

              <label className="form-field">
                Teknolojiler (virgülle ayır)
                <input
                  value={form.tech_stack}
                  onChange={(event) =>
                    setForm({ ...form, tech_stack: event.target.value })
                  }
                  placeholder="React, CSS, Supabase"
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  Kategori
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                  >
                    <option>Web</option>
                    <option>Mobil</option>
                    <option>Tasarım</option>
                    <option>Yazılım</option>
                    <option>Diğer</option>
                  </select>
                </label>

                <label className="form-field">
                  Durum
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                  >
                    <option>Tamamlandı</option>
                    <option>Devam Ediyor</option>
                    <option>Planlandı</option>
                  </select>
                </label>
              </div>

              <label className="form-field">
                Proje bağlantısı
                <input
                  type="url"
                  value={form.project_url}
                  onChange={(event) =>
                    setForm({ ...form, project_url: event.target.value })
                  }
                  placeholder="https://..."
                />
              </label>

              {message && <div className="notice">{message}</div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Kaydediliyor...'
                    : editingId
                      ? 'Değişiklikleri kaydet'
                      : 'Projeyi kaydet'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}