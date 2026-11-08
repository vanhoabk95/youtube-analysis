import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, AudioLines, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleAlert, Clock3, Copy, ExternalLink, FileText, FolderDown, Globe2, Library, Link2, ListVideo, LoaderCircle, Plus, Search, Settings2, ShieldCheck, Trash2, TvMinimal, X, Youtube } from 'lucide-react';
import type { Format, Source, Video } from './types';

const sources = [{ id: 'video', label: 'Video', icon: Youtube }, { id: 'playlist', label: 'Playlist', icon: ListVideo }, { id: 'channel', label: 'Kênh YouTube', icon: TvMinimal }] as const;
const clock = (seconds: number) => { const s = Math.max(0, Math.floor(seconds)); return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const errorText = (error: unknown) => error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : String(error);

export default function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Source>('video');
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('vi,en');
  const [fallback, setFallback] = useState(true);
  const [refreshExisting, setRefreshExisting] = useState(false);
  const [cached, setCached] = useState(0);
  const [format, setFormat] = useState<Format>('txt');
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [notice, setNotice] = useState('');
  const [failures, setFailures] = useState<{title: string; message: string}[]>([]);
  const [showFailures, setShowFailures] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [readerSearch, setReaderSearch] = useState('');
  const [timestamps, setTimestamps] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const live = useRef(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); inputRef.current?.focus(); }
      if (event.key === ',') { event.preventDefault(); setSettings(value => !value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const api = window.desktop;
    if (!api) { setReady(true); return; }
    api.load().then(items => { setVideos(items); setActive(items[0]?.id ?? null); setReady(true); }).catch(error => { setNotice(errorText(error)); setReady(true); });
    return api.onEvent(event => {
      if (event.type === 'phase') setProgress(p => ({ ...p, message: event.message }));
      if (event.type === 'discovered') { setProgress({ current: 0, total: event.total, message: event.title }); setCached(event.cached); }
      if (event.type === 'progress') setProgress({ current: event.current, total: event.total, message: event.title });
      if (event.type === 'video') { setVideos(items => [event.video, ...items.filter(v => v.id !== event.video.id)]); setActive(id => id ?? event.video.id); }
      if (event.type === 'skipped') setFailures(items => [...items, { title: event.title, message: event.message }]);
      if (event.type === 'done' || event.type === 'cancelled' || event.type === 'error') {
        live.current = false; setBusy(false);
        setNotice(event.type === 'done' ? `Đã lưu ${event.success} transcript${event.cached ? ` · Bỏ qua ${event.cached} video đã lưu` : ''}${event.failed ? ` · ${event.failed} video không lấy được` : ''}.` : event.type === 'cancelled' ? 'Đã hủy tác vụ. Các transcript đã lấy vẫn được lưu.' : event.message);
      }
    });
  }, []);
  useEffect(() => { setReaderSearch(''); setDeleting(false); }, [active]);
  const visible = useMemo(() => videos.filter(v => (filter === 'all' || v.source === filter) && `${v.title} ${v.channel} ${v.snippets.map(s => s.text).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [videos, filter, search]);
  const video = videos.find(v => v.id === active);
  const snippets = video?.snippets.filter(s => s.text.toLocaleLowerCase().includes(readerSearch.toLocaleLowerCase())) ?? [];
  const count = (source: string) => videos.filter(v => v.source === source).length;
  const words = video?.snippets.map(s => s.text).join(' ').split(/\s+/).filter(Boolean).length ?? 0;
  async function start() {
    if (!window.desktop) { setNotice('Đang ở bản xem giao diện. Chạy pnpm dev để lấy transcript trong ứng dụng desktop.'); return; }
    if (live.current) return;
    live.current = true; setBusy(true); setNotice(''); setFailures([]); setCached(0); setProgress({ current: 0, total: 0, message: 'Đang khởi động…' });
    try { await window.desktop.start({ url, kind, languages: language.split(',').map(s => s.trim()).filter(Boolean), fallback, refreshExisting }); setRefreshExisting(false); }
    catch (error) { live.current = false; setBusy(false); setNotice(errorText(error)); }
  }
  async function exportVideos(ids: string[]) {
    if (!window.desktop || exporting) return;
    setExporting(true);
    try { const count = await window.desktop.export(ids, format); if (count) setNotice(`Đã xuất ${count} transcript ở định dạng ${format.toUpperCase()}.`); }
    catch (error) { setNotice(errorText(error)); } finally { setExporting(false); }
  }
  async function copy() {
    if (!video) return;
    try { await navigator.clipboard.writeText(video.snippets.map(s => `${timestamps ? `[${clock(s.start)}] ` : ''}${s.text}`).join('\n')); setNotice('Đã sao chép transcript.'); } catch (error) { setNotice(errorText(error)); }
  }
  function selectAll() { setSelected(current => visible.every(v => current.has(v.id)) ? new Set([...current].filter(id => !visible.some(v => v.id === id))) : new Set([...current, ...visible.map(v => v.id)])); }
  return <div className={window.desktop ? 'app-shell native-desktop' : 'app-shell'}>
    <aside className="sidebar">
      <div className="sidebar-titlebar" aria-hidden="true"><span/><span/><span/></div>
      <div className="brand"><div className="brand-icon"><AudioLines size={24}/></div><div><strong>Transcript Studio</strong><span>WORDS WORTH KEEPING</span></div></div>
      <button className="new-button" onClick={() => { inputRef.current?.focus(); setUrl(''); }}><Plus size={17}/>Thêm nguồn mới<span>⌘ N</span></button>
      <div className="nav-label">THƯ VIỆN</div>
      <nav aria-label="Thư viện">
        <button className={filter === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('all')}><Library size={18}/>Tất cả transcript<span>{videos.length}</span></button>
        {sources.map(({ id, label, icon: Icon }) => <button key={id} className={filter === id ? 'nav-item active' : 'nav-item'} onClick={() => setFilter(id)}><Icon size={18}/>{label}<span>{count(id)}</span></button>)}
      </nav>
      <div className="sidebar-note"><div className="note-art"><FileText size={29}/><span><Check size={11}/></span></div><strong>Từ video thành tri thức.</strong><p>Lưu lại những điều hay.<br/>Đọc lại bất cứ lúc nào.</p><div><ShieldCheck size={13}/>Lưu trên thiết bị của bạn</div></div>
      <div className="sidebar-bottom"><button className={settings ? 'nav-item active' : 'nav-item'} onClick={() => setSettings(v => !v)}><Settings2 size={18}/>Tùy chọn<span>⌘ ,</span></button><div className="version"><span className="status-dot"/>Không gian cá nhân<span>v0.1.0</span></div></div>
    </aside>
    <main>
      <header className="titlebar"><div className="breadcrumbs"><Library size={15}/><ChevronRight size={13}/><span>Thư viện</span><ChevronRight size={13}/><strong>{filter === 'all' ? 'Tất cả transcript' : sources.find(s => s.id === filter)?.label}</strong></div><span className="local-badge"><span className="status-dot"/>Lưu trữ cục bộ</span></header>
      <section className="workspace">
        <div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN CỦA BẠN</div><h1>Thư viện transcript<span>.</span></h1><p>Mọi câu chuyện hay, luôn trong tầm tay.</p></div><button className="button secondary" disabled={!videos.length || exporting} onClick={() => exportVideos(selected.size ? [...selected] : visible.map(v => v.id))}><FolderDown size={16}/>{exporting ? 'Đang xuất…' : selected.size ? `Xuất ${selected.size} mục` : 'Xuất thư viện'}</button></div>
        <section className="import-card" aria-label="Thêm nguồn YouTube">
          <div className="import-top"><div className="section-title"><span className="small-icon"><Link2 size={16}/></span><strong>Bắt đầu từ một liên kết</strong></div><span className="quiet">Không cần API key</span></div>
          <div className="source-tabs" role="tablist" aria-label="Loại nguồn">{sources.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? 'source-tab selected' : 'source-tab'} disabled={busy} onClick={() => setKind(id)}><Icon size={15}/>{label}</button>)}</div>
          <form className="url-form" onSubmit={event => { event.preventDefault(); void start(); }}><div className="url-input"><Link2 size={17}/><input ref={inputRef} aria-label="Liên kết YouTube" placeholder={kind === 'video' ? 'Dán liên kết video YouTube vào đây…' : kind === 'playlist' ? 'https://www.youtube.com/playlist?list=…' : 'https://www.youtube.com/@tenkenh'} value={url} onChange={event => setUrl(event.target.value)} disabled={busy}/>{url && !busy && <button type="button" className="icon-button" aria-label="Xóa liên kết" onClick={() => setUrl('')}><X size={14}/></button>}</div><button className="button primary" disabled={busy || !url.trim() || !ready} type="submit">{busy ? <LoaderCircle className="spin" size={16}/> : <ArrowDownToLine size={16}/>}Lấy transcript</button></form>
          <div className="import-footer"><span><Globe2 size={13}/>{language === 'vi,en' ? 'Ưu tiên Tiếng Việt, English' : `Ngôn ngữ: ${language}`}<button onClick={() => setSettings(v => !v)} aria-label="Đổi ngôn ngữ"><ChevronDown size={12}/></button></span><span><CheckCheck size={14}/>{fallback ? 'Dùng phụ đề sẵn có khi cần' : 'Chỉ ngôn ngữ ưu tiên'}</span><span className="format-control">Xuất dưới dạng<select aria-label="Định dạng xuất" value={format} onChange={event => setFormat(event.target.value as Format)}><option value="txt">TXT</option><option value="srt">SRT</option><option value="json">JSON</option></select></span></div>
          {settings && <div className="settings-panel"><label>Ngôn ngữ ưu tiên<select value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}><option value="vi,en">Tiếng Việt → English</option><option value="en,vi">English → Tiếng Việt</option><option value="ja,en">日本語 → English</option><option value="ko,en">한국어 → English</option><option value="zh-Hans,en">中文 → English</option></select></label><label className="check-label"><input type="checkbox" checked={fallback} disabled={busy} onChange={event => setFallback(event.target.checked)}/>Dùng ngôn ngữ khác nếu không có ngôn ngữ ưu tiên</label><p>Ưu tiên phụ đề do người tạo cung cấp, sau đó đến phụ đề tự động. Mỗi video được lưu một bản transcript.</p></div>}
          <div className="settings-panel"><label className="check-label"><input type="checkbox" checked={refreshExisting} disabled={busy} onChange={event => setRefreshExisting(event.target.checked)}/>Lấy lại transcript đã lưu cho tác vụ tiếp theo</label><p>{busy && cached > 0 ? `Đã bỏ qua ${cached} video có transcript trong thư viện.` : 'Mặc định bỏ qua video đã có transcript, kể cả khi chạy lại sau lỗi hoặc đổi nguồn. Bật tùy chọn này để chủ động cập nhật bản đã lưu.'}</p></div>
        </section>
        {!window.desktop && <div className="preview-banner"><CircleAlert size={15}/><span>Bản xem giao diện · Mở bằng <code>pnpm dev</code> để sử dụng tính năng desktop.</span></div>}
        {busy && <div className="job-panel" aria-live="polite"><div><LoaderCircle className="spin" size={17}/><strong>{progress.total ? `${progress.current} / ${progress.total} video` : 'Đang tìm video…'}</strong><span>{progress.message}</span><button className="text-button" onClick={() => window.desktop?.cancel().catch(error => setNotice(errorText(error)))}>Hủy tác vụ</button></div><progress max={progress.total || 1} value={progress.total ? Math.max(0, progress.current - 1) : undefined}/></div>}
        {notice && <div className="notice" role="status"><CircleAlert size={16}/><span>{notice}</span><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={15}/></button></div>}
        {failures.length > 0 && <div className="failures"><button onClick={() => setShowFailures(v => !v)}><CircleAlert size={14}/>{failures.length} video không lấy được transcript<ChevronDown size={14}/></button>{showFailures && <ul>{failures.map((item, i) => <li key={i}><strong>{item.title}</strong><p>{item.message}</p></li>)}</ul>}</div>}
        <div className="library-heading"><div><h2>{filter === 'all' ? 'Tất cả transcript' : sources.find(s => s.id === filter)?.label}</h2><span className="count-badge">{visible.length}</span></div><div className="list-tools"><div className="search"><Search size={14}/><input aria-label="Tìm trong thư viện" placeholder="Tìm trong thư viện…" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="Xóa tìm kiếm" onClick={() => setSearch('')}><X size={12}/></button>}</div><span className="sort-label"><Clock3 size={13}/>Mới nhất</span></div></div>
        <div className={`library-grid ${video ? 'has-reader' : ''}`}>
          <section className="video-list" aria-label="Danh sách transcript">
            <div className="list-header"><label><input type="checkbox" aria-label="Chọn tất cả video đang hiển thị" disabled={!visible.length} checked={!!visible.length && visible.every(v => selected.has(v.id))} onChange={selectAll}/><span>VIDEO</span></label><span>NGÔN NGỮ</span></div>
            {!ready ? <div className="empty-list"><LoaderCircle className="spin" size={24}/>Đang đọc thư viện…</div> : !visible.length ? <div className="empty-list"><div className="empty-art"><FileText size={34}/><span><AudioLines size={20}/></span></div><h3>{search ? 'Chưa tìm thấy kết quả' : 'Một thư viện đang chờ bạn'}</h3><p>{search ? 'Thử tìm theo tên video, kênh hoặc nội dung transcript.' : 'Thêm video, playlist hoặc kênh YouTube đầu tiên. Transcript của bạn sẽ xuất hiện tại đây.'}</p>{!search && <button className="button secondary" onClick={() => inputRef.current?.focus()}><Plus size={15}/>Thêm nguồn đầu tiên</button>}<div className="empty-formats"><span>TXT</span><span>SRT</span><span>JSON</span></div></div> : visible.map(item => <div key={item.id} className={active === item.id ? 'video-row is-active' : 'video-row'}><input type="checkbox" aria-label={`Chọn ${item.title}`} checked={selected.has(item.id)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}/><button className="video-main" onClick={() => setActive(item.id)}><div className="thumbnail"><img loading="lazy" src={`https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`} alt=""/><span>{clock(item.duration)}</span></div><div className="video-info"><strong>{item.title}</strong><span>{item.channel}</span><small><Check size={11}/>Đã lưu<span>·</span>{date(item.savedAt)}</small></div><span className="lang-chip">{item.languageCode.toUpperCase()}</span></button></div>)}
            <footer className="list-footer"><span>{visible.length} transcript{selected.size > 0 ? ` · ${selected.size} đã chọn` : ''}</span><span><ShieldCheck size={12}/>Chỉ lưu trên thiết bị này</span></footer>
          </section>
          {video ? <section className="reader" aria-label="Nội dung transcript"><div className="reader-top"><div><BookOpen size={16}/><strong>Transcript</strong></div><div><button className="icon-button" aria-label="Sao chép transcript" title="Sao chép" onClick={copy}><Copy size={15}/></button><button className="icon-button" aria-label="Xuất transcript này" title="Xuất transcript" disabled={exporting} onClick={() => exportVideos([video.id])}><ArrowDownToLine size={16}/></button><button className="icon-button" aria-label="Đóng khung đọc" onClick={() => setActive(null)}><X size={16}/></button></div></div><div className="reader-title"><span className="eyebrow">{video.channel}</span><h3>{video.title}</h3><div><span><Globe2 size={12}/>{video.language}</span><span>{video.generated ? 'Phụ đề tự động' : 'Phụ đề thủ công'}</span><button className="text-button" onClick={() => window.desktop?.openVideo(video.id).catch(error => setNotice(errorText(error)))} aria-label="Mở video trên YouTube"><ExternalLink size={13}/></button></div></div><div className="reader-controls"><div className="search"><Search size={14}/><input aria-label="Tìm trong transcript" placeholder="Tìm trong transcript…" value={readerSearch} onChange={event => setReaderSearch(event.target.value)}/></div><button className={timestamps ? 'icon-button toggled' : 'icon-button'} aria-label="Bật/tắt mốc thời gian" aria-pressed={timestamps} onClick={() => setTimestamps(v => !v)}><Clock3 size={15}/></button></div><div className="transcript-body">{snippets.length ? snippets.map((snippet, i) => <div key={`${snippet.start}-${i}`} className={timestamps ? 'transcript-line' : 'transcript-line no-timestamps'}>{timestamps && <time>{clock(snippet.start)}</time>}<p>{snippet.text}</p></div>) : <p className="quiet">Không tìm thấy đoạn phù hợp.</p>}</div><footer className="reader-footer"><span>{words.toLocaleString('vi-VN')} từ · {video.snippets.length} đoạn</span>{deleting ? <div><span>Xóa transcript?</span><button className="text-button danger" onClick={async () => { try { const items = await window.desktop!.remove(video.id); setVideos(items); setActive(items[0]?.id ?? null); setSelected(current => new Set([...current].filter(id => id !== video.id))); } catch (error) { setNotice(errorText(error)); } }}>Xóa</button><button className="icon-button" aria-label="Không xóa" onClick={() => setDeleting(false)}><X size={13}/></button></div> : <button className="icon-button" aria-label="Xóa transcript" disabled={busy} onClick={() => setDeleting(true)}><Trash2 size={14}/></button>}</footer></section> : <section className="reader reader-placeholder"><div className="reader-top"><div><BookOpen size={16}/><strong>Trình đọc transcript</strong></div><span className="quiet">XEM TRƯỚC</span></div><div className="reader-placeholder-body"><div className="paper-illustration"><div><AudioLines size={25}/><span>TRANSCRIPT</span></div><i/><i/><i/><i/><i/><i/><span className="paper-check"><Check size={19}/></span></div><h3>Không bỏ lỡ một ý tưởng nào.</h3><p>Chọn một transcript để đọc, tìm kiếm<br/>và sao chép nội dung ngay tại đây.</p><div><Clock3 size={14}/>Mốc thời gian<Copy size={14}/>Sao chép nhanh</div></div><footer className="reader-footer"><span>Được tạo nên để tập trung.</span><AudioLines size={14}/></footer></section>}
        </div>
        <footer className="workspace-footer"><span><ShieldCheck size={13}/>Nội dung của bạn. Không gian của bạn.</span><span>Được hỗ trợ bởi youtube-transcript-api<ExternalLink size={11}/></span></footer>
      </section>
    </main>
  </div>;
}
