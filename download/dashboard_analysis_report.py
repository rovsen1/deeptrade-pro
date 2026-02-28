from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.units import cm

# Register fonts
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/dashboard_analysis_report.pdf",
    pagesize=A4,
    title="Kripto Dashboard Analiz Raporu",
    author='Z.ai',
    creator='Z.ai',
    subject='Profesyonel Kripto Trading Dashboard Kiyaslama ve Gelistirme Raporu'
)

# Styles
styles = getSampleStyleSheet()

# Turkish styles
title_style = ParagraphStyle(
    'TurkishTitle',
    fontName='Times New Roman',
    fontSize=24,
    leading=30,
    alignment=TA_CENTER,
    spaceAfter=20,
    textColor=colors.HexColor('#1F4E79')
)

heading1_style = ParagraphStyle(
    'TurkishH1',
    fontName='Times New Roman',
    fontSize=16,
    leading=22,
    alignment=TA_LEFT,
    spaceBefore=20,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79')
)

heading2_style = ParagraphStyle(
    'TurkishH2',
    fontName='Times New Roman',
    fontSize=13,
    leading=18,
    alignment=TA_LEFT,
    spaceBefore=15,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

body_style = ParagraphStyle(
    'TurkishBody',
    fontName='Times New Roman',
    fontSize=10.5,
    leading=16,
    alignment=TA_LEFT,
    spaceAfter=8
)

# Table styles
header_style = ParagraphStyle(
    'TableHeader',
    fontName='Times New Roman',
    fontSize=10,
    textColor=colors.white,
    alignment=TA_CENTER
)

cell_style = ParagraphStyle(
    'TableCell',
    fontName='Times New Roman',
    fontSize=9,
    textColor=colors.black,
    alignment=TA_LEFT
)

cell_center = ParagraphStyle(
    'TableCellCenter',
    fontName='Times New Roman',
    fontSize=9,
    textColor=colors.black,
    alignment=TA_CENTER
)

story = []

# Title
story.append(Paragraph("<b>KRIPTO TRADING DASHBOARD</b>", title_style))
story.append(Paragraph("<b>Profesyonel Analiz ve Kiyaslama Raporu</b>", ParagraphStyle(
    'Subtitle', fontName='Times New Roman', fontSize=14, alignment=TA_CENTER, spaceAfter=30
)))
story.append(Spacer(1, 20))

# Executive Summary
story.append(Paragraph("<b>1. YONETICI OZETI</b>", heading1_style))
story.append(Paragraph(
    "Bu rapor, mevcut Kripto Analiz Dashboard'un profesyonel standartlarla karsilastirmali analizini sunmaktadir. "
    "TradingView, Binance ve piyasadaki lider platformlarin ozellikleri incelenmis, mevcut dashboard'un guclu yonleri "
    "ve gelistirilmesi gereken alanlar belirlenmistir. Rapor, dashboard'u dunya standartlarina tasimak icin "
    "pratik oneriler ve oncelikli gelistirme yol haritasi icermektedir.",
    body_style
))
story.append(Spacer(1, 15))

# Current Features
story.append(Paragraph("<b>2. MEVCUT DASHBOARD OZELLIKLERI</b>", heading1_style))

story.append(Paragraph("<b>2.1 Teknik Indikatorler (Mevcut)</b>", heading2_style))
indicators_data = [
    [Paragraph('<b>Indikator</b>', header_style), Paragraph('<b>Durum</b>', header_style), Paragraph('<b>Kalite</b>', header_style)],
    [Paragraph('RSI (14)', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Yukselt', cell_center)],
    [Paragraph('MACD', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Iyi', cell_center)],
    [Paragraph('EMA (9, 21, 50, 200)', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Iyi', cell_center)],
    [Paragraph('Stochastic Oscillator', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Iyi', cell_center)],
    [Paragraph('ATR (Volatilite)', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('VWAP', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Iyi', cell_center)],
    [Paragraph('Bollinger Bands', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('Support/Resistance', cell_style), Paragraph('Mevcut', cell_center), Paragraph('Orta', cell_center)],
]

indicators_table = Table(indicators_data, colWidths=[5*cm, 3*cm, 3*cm])
indicators_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(indicators_table)
story.append(Spacer(1, 15))

story.append(Paragraph("<b>2.2 Mevcut Ozellikler</b>", heading2_style))
features_data = [
    [Paragraph('<b>Ozellik</b>', header_style), Paragraph('<b>Durum</b>', header_style), Paragraph('<b>Not</b>', header_style)],
    [Paragraph('Scalp Sinyalleri (5m, 15m, 1h)', cell_style), Paragraph('+', cell_center), Paragraph('Aktif', cell_center)],
    [Paragraph('Swing Sinyalleri (4h, 1d)', cell_style), Paragraph('+', cell_center), Paragraph('Aktif', cell_center)],
    [Paragraph('Order Book', cell_style), Paragraph('+', cell_center), Paragraph('Temel duzey', cell_center)],
    [Paragraph('BTC Dominance', cell_style), Paragraph('+', cell_center), Paragraph('Aktif', cell_center)],
    [Paragraph('AI Piyasa Yorumu', cell_style), Paragraph('+', cell_center), Paragraph('LLM entegrasyonu', cell_center)],
    [Paragraph('Telegram Bildirim', cell_style), Paragraph('+', cell_center), Paragraph('Kullanici token', cell_center)],
    [Paragraph('Kullanici Profili', cell_style), Paragraph('+', cell_center), Paragraph('Local storage', cell_center)],
    [Paragraph('Binance Temasi', cell_style), Paragraph('+', cell_center), Paragraph('Tam uyumlu', cell_center)],
]

features_table = Table(features_data, colWidths=[5.5*cm, 2*cm, 4*cm])
features_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(features_table)
story.append(Spacer(1, 20))

# Missing Features
story.append(Paragraph("<b>3. EKSIK OZELLIKLER VE KRITIK GELISTIRMELER</b>", heading1_style))

story.append(Paragraph("<b>3.1 Kritik Oneme Sahip Eksikler</b>", heading2_style))
missing_data = [
    [Paragraph('<b>Ozellik</b>', header_style), Paragraph('<b>Onem</b>', header_style), Paragraph('<b>Zorluk</b>', header_style), Paragraph('<b>Aciklama</b>', header_style)],
    [Paragraph('Depth Chart', cell_style), Paragraph('KRITIK', cell_center), Paragraph('Orta', cell_center), Paragraph('Order book gorsellestirme', cell_style)],
    [Paragraph('Fiyat Alarmlari', cell_style), Paragraph('KRITIK', cell_center), Paragraph('Orta', cell_center), Paragraph('Kullanici tanimli fiyat bildirimleri', cell_style)],
    [Paragraph('Candlestick Grafik', cell_style), Paragraph('KRITIK', cell_center), Paragraph('Yuksek', cell_center), Paragraph('TradingView tarzi mum grafikleri', cell_style)],
    [Paragraph('Cizim Araclari', cell_style), Paragraph('Yuksek', cell_center), Paragraph('Yuksek', cell_center), Paragraph('Trend cizgisi, fibonacci vb.', cell_style)],
    [Paragraph('Portfoy Yonetimi', cell_style), Paragraph('Yuksek', cell_center), Paragraph('Orta', cell_center), Paragraph('Sanal/gercek portfoy takibi', cell_style)],
    [Paragraph('Pozisyon Hesaplayici', cell_style), Paragraph('Yuksek', cell_center), Paragraph('Dusuk', cell_center), Paragraph('Kar/zarar, pozisyon boyutu', cell_style)],
    [Paragraph('Multi-Timeframe Görünüm', cell_style), Paragraph('Orta', cell_center), Paragraph('Orta', cell_center), Paragraph('Ayni ekranda coklu zaman dilimi', cell_style)],
    [Paragraph('Funding Rate', cell_style), Paragraph('Orta', cell_center), Paragraph('Dusuk', cell_center), Paragraph('Futures funding rate takibi', cell_style)],
    [Paragraph('Liquidation Heatmap', cell_style), Paragraph('Orta', cell_center), Paragraph('Orta', cell_center), Paragraph('Likidasyon haritasi', cell_style)],
    [Paragraph('Whale Alert', cell_style), Paragraph('Orta', cell_center), Paragraph('Dusuk', cell_center), Paragraph('Buyuk islem takibi', cell_style)],
]

missing_table = Table(missing_data, colWidths=[3.5*cm, 2*cm, 2*cm, 5*cm])
missing_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(missing_table)
story.append(Spacer(1, 20))

# Competitor Analysis
story.append(Paragraph("<b>4. RAKIP ANALIZI</b>", heading1_style))

story.append(Paragraph("<b>4.1 TradingView Karsilastirmasi</b>", heading2_style))
tv_data = [
    [Paragraph('<b>Ozellik</b>', header_style), Paragraph('<b>TradingView</b>', header_style), Paragraph('<b>Bizim Dashboard</b>', header_style), Paragraph('<b>Fark</b>', header_style)],
    [Paragraph('Indikator Sayisi', cell_style), Paragraph('100+', cell_center), Paragraph('8', cell_center), Paragraph('-92', cell_center)],
    [Paragraph('Cizim Araclari', cell_style), Paragraph('50+', cell_center), Paragraph('0', cell_center), Paragraph('-50', cell_center)],
    [Paragraph('Grafik Tipleri', cell_style), Paragraph('15+', cell_center), Paragraph('1 (Alan)', cell_center), Paragraph('-14', cell_center)],
    [Paragraph('Alarm Sistemi', cell_style), Paragraph('Sinirsiz', cell_center), Paragraph('Telegram only', cell_center), Paragraph('Sinirli', cell_center)],
    [Paragraph('Sosyal Ozellikler', cell_style), Paragraph('Tam', cell_center), Paragraph('Yok', cell_center), Paragraph('Yok', cell_center)],
    [Paragraph('Paper Trading', cell_style), Paragraph('Var', cell_center), Paragraph('Yok', cell_center), Paragraph('Yok', cell_center)],
    [Paragraph('Strateji Test', cell_style), Paragraph('Pine Script', cell_center), Paragraph('Yok', cell_center), Paragraph('Yok', cell_center)],
    [Paragraph('AI Yorumu', cell_style), Paragraph('Yok', cell_center), Paragraph('Var', cell_center), Paragraph('+1', cell_center)],
    [Paragraph('Ucretsiz Kullanim', cell_style), Paragraph('Sinirli', cell_center), Paragraph('Tamamen ucretsiz', cell_center), Paragraph('+1', cell_center)],
]

tv_table = Table(tv_data, colWidths=[3.5*cm, 3*cm, 3.5*cm, 2*cm])
tv_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(tv_table)
story.append(Spacer(1, 15))

story.append(Paragraph("<b>4.2 Binance Karsilastirmasi</b>", heading2_style))
binance_data = [
    [Paragraph('<b>Ozellik</b>', header_style), Paragraph('<b>Binance</b>', header_style), Paragraph('<b>Bizim Dashboard</b>', header_style), Paragraph('<b>Fark</b>', header_style)],
    [Paragraph('Order Book Depth', cell_style), Paragraph('Gelismis', cell_center), Paragraph('Temel', cell_center), Paragraph('Gelistirilmeli', cell_center)],
    [Paragraph('Depth Chart', cell_style), Paragraph('Var', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('Trade Ekrani', cell_style), Paragraph('Entegre', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('Funding Rate', cell_style), Paragraph('Anlik', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('Open Interest', cell_style), Paragraph('Var', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('Liquidations', cell_style), Paragraph('Var', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('Convert/Swap', cell_style), Paragraph('Var', cell_center), Paragraph('Yok', cell_center), Paragraph('Eksik', cell_center)],
    [Paragraph('API Entegrasyon', cell_style), Paragraph('Tam', cell_center), Paragraph('Sadece okuma', cell_center), Paragraph('Sinirli', cell_center)],
]

binance_table = Table(binance_data, colWidths=[3.5*cm, 3*cm, 3.5*cm, 2*cm])
binance_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(binance_table)
story.append(Spacer(1, 20))

# Recommended Indicators
story.append(Paragraph("<b>5. ONEMLI INDIKATOR ONERILERI</b>", heading1_style))
story.append(Paragraph(
    "Profesyonel traderlar tarafindan en cok kullanilan ve dashboard'a eklenmesi onerilen indikatorler:",
    body_style
))

indicators_rec = [
    [Paragraph('<b>Indikator</b>', header_style), Paragraph('<b>Kullanim Amaci</b>', header_style), Paragraph('<b>Oncelik</b>', header_style)],
    [Paragraph('Ichimoku Cloud', cell_style), Paragraph('Trend ve destek/direnç analizi', cell_style), Paragraph('Yuksek', cell_center)],
    [Paragraph('Fibonacci Retracement', cell_style), Paragraph('Düzeltme seviyeleri tespiti', cell_style), Paragraph('Yuksek', cell_center)],
    [Paragraph('Parabolic SAR', cell_style), Paragraph('Trend yonu ve ters donusler', cell_style), Paragraph('Orta', cell_center)],
    [Paragraph('ADX (Trend Gucu)', cell_style), Paragraph('Trend gucu olcumu', cell_style), Paragraph('Orta', cell_center)],
    [Paragraph('OBV (On Balance Volume)', cell_style), Paragraph('Hacim bazli trend', cell_style), Paragraph('Yuksek', cell_center)],
    [Paragraph('SuperTrend', cell_style), Paragraph('Trend takip indikatoru', cell_style), Paragraph('Yuksek', cell_center)],
    [Paragraph('Pivot Points', cell_style), Paragraph('Destek/direnç seviyeleri', cell_style), Paragraph('Orta', cell_center)],
    [Paragraph('Volume Profile', cell_style), Paragraph('Hacim dagilim analizi', cell_style), Paragraph('Yuksek', cell_center)],
    [Paragraph('Keltner Channel', cell_style), Paragraph('Volatilite kanali', cell_style), Paragraph('Dusuk', cell_center)],
    [Paragraph('Williams %R', cell_style), Paragraph('Aşiri alım/satım', cell_style), Paragraph('Dusuk', cell_center)],
]

indicators_rec_table = Table(indicators_rec, colWidths=[4*cm, 6*cm, 2*cm])
indicators_rec_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(indicators_rec_table)
story.append(Spacer(1, 20))

# Development Roadmap
story.append(Paragraph("<b>6. GELISTIRME YOL HARITASI</b>", heading1_style))

story.append(Paragraph("<b>Faz 1: Temel Gelistirmeler (1-2 Hafta)</b>", heading2_style))
faz1 = [
    [Paragraph('<b>Gorev</b>', header_style), Paragraph('<b>Tahmini Sure</b>', header_style), Paragraph('<b>Zorluk</b>', header_style)],
    [Paragraph('Depth Chart implementasyonu', cell_style), Paragraph('2 gun', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('Fiyat alarmlari sistemi', cell_style), Paragraph('1 gun', cell_center), Paragraph('Dusuk', cell_center)],
    [Paragraph('Pozisyon hesaplayici', cell_style), Paragraph('1 gun', cell_center), Paragraph('Dusuk', cell_center)],
    [Paragraph('Funding Rate gosterimi', cell_style), Paragraph('0.5 gun', cell_center), Paragraph('Dusuk', cell_center)],
    [Paragraph('Open Interest takibi', cell_style), Paragraph('0.5 gun', cell_center), Paragraph('Dusuk', cell_center)],
]
faz1_table = Table(faz1, colWidths=[6*cm, 3*cm, 3*cm])
faz1_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0ECB81')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(faz1_table)
story.append(Spacer(1, 10))

story.append(Paragraph("<b>Faz 2: Orta Seviye Gelistirmeler (2-3 Hafta)</b>", heading2_style))
faz2 = [
    [Paragraph('<b>Gorev</b>', header_style), Paragraph('<b>Tahmini Sure</b>', header_style), Paragraph('<b>Zorluk</b>', header_style)],
    [Paragraph('TradingView tarzi mum grafikleri', cell_style), Paragraph('3 gun', cell_center), Paragraph('Yuksek', cell_center)],
    [Paragraph('Temel cizim araclari', cell_style), Paragraph('2 gun', cell_center), Paragraph('Yuksek', cell_center)],
    [Paragraph('Portfoy yonetim sistemi', cell_style), Paragraph('2 gun', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('SuperTrend ve Ichimoku', cell_style), Paragraph('1 gun', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('Multi-timeframe gorunum', cell_style), Paragraph('2 gun', cell_center), Paragraph('Orta', cell_center)],
]
faz2_table = Table(faz2, colWidths=[6*cm, 3*cm, 3*cm])
faz2_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0B90B')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(faz2_table)
story.append(Spacer(1, 10))

story.append(Paragraph("<b>Faz 3: Ileri Seviye Gelistirmeler (3-4 Hafta)</b>", heading2_style))
faz3 = [
    [Paragraph('<b>Gorev</b>', header_style), Paragraph('<b>Tahmini Sure</b>', header_style), Paragraph('<b>Zorluk</b>', header_style)],
    [Paragraph('Whale Alert entegrasyonu', cell_style), Paragraph('2 gun', cell_center), Paragraph('Orta', cell_center)],
    [Paragraph('Liquidation heatmap', cell_style), Paragraph('3 gun', cell_center), Paragraph('Yuksek', cell_center)],
    [Paragraph('Volume Profile analizi', cell_style), Paragraph('2 gun', cell_center), Paragraph('Yuksek', cell_center)],
    [Paragraph('Backtest sistemi', cell_style), Paragraph('5 gun', cell_center), Paragraph('Cok Yuksek', cell_center)],
    [Paragraph('Mobil uygulama optimizasyonu', cell_style), Paragraph('3 gun', cell_center), Paragraph('Orta', cell_center)],
]
faz3_table = Table(faz3, colWidths=[6*cm, 3*cm, 3*cm])
faz3_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F6465D')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(faz3_table)
story.append(Spacer(1, 20))

# Summary
story.append(Paragraph("<b>7. DEGERLENDIRME OZETI</b>", heading1_style))
story.append(Paragraph(
    "Mevcut dashboard, temel teknik analiz ozellikleri acisindan yeterli bir altyapiya sahiptir. "
    "Binance temasi, AI yorumu ve Telegram bildirimleri gibi ozellikler dashboard'u digerlerinden ayiran "
    "artilaridir. Ancak, profesyonel traderlarin ihtiyaclarini karsilamak icin onemli eksiklikler bulunmaktadir.",
    body_style
))
story.append(Spacer(1, 10))

# Score Table
score_data = [
    [Paragraph('<b>Kategori</b>', header_style), Paragraph('<b>Mevcut Skor</b>', header_style), Paragraph('<b>Hedef Skor</b>', header_style)],
    [Paragraph('Teknik Indikatorler', cell_style), Paragraph('7/10', cell_center), Paragraph('9/10', cell_center)],
    [Paragraph('Gorsellestirme', cell_style), Paragraph('5/10', cell_center), Paragraph('9/10', cell_center)],
    [Paragraph('Kullanici Deneyimi', cell_style), Paragraph('7/10', cell_center), Paragraph('9/10', cell_center)],
    [Paragraph('Bildirim Sistemi', cell_style), Paragraph('6/10', cell_center), Paragraph('9/10', cell_center)],
    [Paragraph('Portfoy Yonetimi', cell_style), Paragraph('3/10', cell_center), Paragraph('8/10', cell_center)],
    [Paragraph('Trading Araclari', cell_style), Paragraph('4/10', cell_center), Paragraph('8/10', cell_center)],
    [Paragraph('TOPLAM', ParagraphStyle('Bold', fontName='Times New Roman', fontSize=10, textColor=colors.black)), 
     Paragraph('5.3/10', ParagraphStyle('Bold', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER)), 
     Paragraph('8.7/10', ParagraphStyle('Bold', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER))],
]
score_table = Table(score_data, colWidths=[5*cm, 3.5*cm, 3.5*cm])
score_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -2), colors.white),
    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F5F5F5')),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(score_table)

# Build PDF
doc.build(story)
print("PDF olusturuldu: /home/z/my-project/download/dashboard_analysis_report.pdf")
