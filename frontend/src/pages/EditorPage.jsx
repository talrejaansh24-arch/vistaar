import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, FabricImage, Rect, Textbox, Circle, Path, Polygon, Triangle, PencilBrush } from 'fabric';
import useStore from '../store/useStore';
import { authAPI, designAPI, API_ORIGIN, resolveAssetUrl } from '../api/client';
import { 
  RotateCcw, Undo2, Redo2, Trash2, Sliders, Layers, FlipHorizontal, Copy,
  LayoutTemplate, Type, Palette, UploadCloud, Square, Images, Video, QrCode, PlayCircle, Code, Share2, Save, Download, Printer,
  Eye, Edit3, PenTool, Brush
} from 'lucide-react';
import gsap from 'gsap';
import BottlePreview from '../components/BottlePreview';
import './EditorPage.css';

const BOTTLE_SIZES = [
  { id: '250ml', label: '250ml', price: 15 },
  { id: '500ml', label: '500ml', price: 20 },
  { id: '1000ml', label: '1000ml', price: 30 },
];
const CANVAS_WIDTH = 880;
const CANVAS_HEIGHT = 520;
const ARTBOARD_WIDTH = 640;
const ARTBOARD_HEIGHT = 340;

export default function EditorPage() {
  const navigate = useNavigate();
  const { currentDesign, generatedDesigns, setGeneratedDesigns, addToCart, setLoading, designInput, siteConfig } = useStore();
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTool, setActiveTool] = useState('templates');
  const [activeSize, setActiveSize] = useState('500ml');
  const [quantity, setQuantity] = useState(100);
  const [selectedObjectType, setSelectedObjectType] = useState('none');
  const [textDraft, setTextDraft] = useState(() => currentDesign?.business_name || designInput?.business_name || 'YOUR BRAND');
  const [taglineDraft, setTaglineDraft] = useState(() => currentDesign?.bottle_text || designInput?.bottle_text || 'PREMIUM DRINKING WATER');
  const [fontSize, setFontSize] = useState(44);
  const bottleSizes = useMemo(() => [
    { id: '250ml', label: '250ml', price: parseFloat(siteConfig?.price_250ml || 15) },
    { id: '500ml', label: '500ml', price: parseFloat(siteConfig?.price_500ml || 20) },
    { id: '1000ml', label: '1000ml', price: parseFloat(siteConfig?.price_1000ml || 30) },
  ], [siteConfig]);
  const [textColor, setTextColor] = useState(() => currentDesign?.colors?.[1] || '#55efc4');
  const [labelColor, setLabelColor] = useState(() => currentDesign?.colors?.[0] || '#0a3d2f');
  const [activeStyleName, setActiveStyleName] = useState(() => currentDesign?.style || 'Brandex');
  const [codeFormat, setCodeFormat] = useState('react');
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [activeOpacity, setActiveOpacity] = useState(1);
  const [aiPrompt, setAiPrompt] = useState('premium eco-friendly label for corporate events');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDetail, setAiDetail] = useState('medium');
  const [aiCategory, setAiCategory] = useState('corporate');
  const [aiStyle, setAiStyle] = useState('premium');
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templateLoadError, setTemplateLoadError] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [qrText, setQrText] = useState('https://vistaarwater.co');
  const [activeFontFamily, setActiveFontFamily] = useState('Outfit, sans-serif');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  
  // Paint tool state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushWidth, setBrushWidth] = useState(5);

  const historyRef = useRef({ stack: [], index: -1 });
  const isUndoingRedoing = useRef(false);
  const canvasDisposedRef = useRef(false);

  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.isDrawingMode = isDrawingMode;
      if (isDrawingMode) {
        fabricRef.current.freeDrawingBrush = new PencilBrush(fabricRef.current);
        fabricRef.current.freeDrawingBrush.color = brushColor;
        fabricRef.current.freeDrawingBrush.width = brushWidth;
      }
    }
  }, [isDrawingMode, brushColor, brushWidth]);

  const saveHistoryState = () => { if(fabricRef.current) { setPreviewImageUrl(fabricRef.current.toDataURL({ format: "png", quality: 0.8 })); }

    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON(['name', 'selectable', 'evented', 'originX', 'originY']);
    const stateStr = JSON.stringify(json);
    
    const history = historyRef.current;
    const nextStack = history.stack.slice(0, history.index + 1);
    
    if (nextStack.length > 0 && nextStack[nextStack.length - 1] === stateStr) {
      return;
    }
    nextStack.push(stateStr);
    
    if (nextStack.length > 50) {
      nextStack.shift();
    }
    
    history.stack = nextStack;
    history.index = nextStack.length - 1;
    
    setHistoryIndex(history.index);
    setHistoryStack(nextStack);
  };

  const renderStyleVector = (canvas, style, brand, tagline, customBg = null, customText = null) => {
    if (!canvas) return;
    
    // Clear snap guides and other elements — try-catch guards disposed canvas
    try { canvas.clear(); } catch { return; }
    canvas.backgroundColor = '#081224';

    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;

    const palettes = {
      Brandex: { bg: customBg || '#00a8ff', text: customText || '#ffffff' },
      Forever: { bg: customBg || '#0096f2', text: customText || '#2d3436' },
      WaveUp: { bg: customBg || '#ebf0f5', text: customText || '#0b1e50', accent: '#00a8ff' },
      Fiji: { bg: customBg || '#ffffff', text: customText || '#009650' },
      Myst: { bg: customBg || '#ffffff', text: customText || '#009650' },
      Pure: { bg: customBg || '#1a1a1a', text: customText || '#ffffff', accent: '#888888' },
      Reva: { bg: customBg || '#1e2022', text: customText || '#a3e635', accent: '#ffffff' },
      OpenLate: { bg: customBg || '#000000', text: customText || '#ffffff' },
      OneBurger: { bg: customBg || '#ffffff', text: customText || '#000000' },
      Mountain: { bg: customBg || '#dff9fb', text: customText || '#ffffff', accent: '#130cb7' },
      Vivia: { bg: customBg || '#e60028', text: customText || '#ffffff', accent: '#009688' },
      Melt: { bg: customBg || '#191c1e', text: customText || '#ffffff', accent: '#e60028' },
      LifeWtrArt1: { bg: customBg || '#ffffff', text: customText || '#000000', accent: '#ff6b6b' },
      LifeWtrArt2: { bg: customBg || '#f5f6fa', text: customText || '#000000', accent: '#ff6b6b' },
      LifeWtrArt3: { bg: customBg || '#ffffff', text: customText || '#000000', accent: '#ff007f' },
    };

    const colors = palettes[style] || palettes.Brandex;

    // 1. Label Base Rect (originX: 'center', originY: 'center' at artboard center)
    const labelBase = new Rect({
      left: centerX,
      top: centerY,
      width: ARTBOARD_WIDTH,
      height: ARTBOARD_HEIGHT,
      fill: ['Forever', 'Fiji', 'Myst', 'OneBurger', 'LifeWtrArt1', 'LifeWtrArt3'].includes(style) ? '#ffffff' : colors.bg,
      rx: 18,
      ry: 18,
      stroke: 'rgba(85, 239, 196, 0.35)',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      name: 'labelBase',
    });
    canvas.add(labelBase);

    // 2. Draw Style-Specific Vectors
    const isUploadedTemplate = style.startsWith('Uploaded_');
    const isCustomTemplate = !palettes[style] && !isUploadedTemplate;

    if (isUploadedTemplate) {
      // Determine overlay type based on the ID modulo 3 (matching backend logic)
      const uploadIdx = parseInt(style.split('_')[1]) || 0;
      const overlayTypes = ["luxury", "minimal", "modern"];
      const overlayChoice = overlayTypes[uploadIdx % overlayTypes.length];
      
      const imgUrl = currentDesign?.base_image_url || currentDesign?.preview_url || currentDesign?.file_path;
      // We must strip the backend PIL text generation so we only use the raw image.
      // Wait, the backend currently bakes the text into preview_url for uploaded designs!
      // But the frontend should just load it as a background and overlay editable text anyway.
      // Ideally we load the raw upload path if available, but for now we'll use preview_url.
      
      // Let's create the editable text first
      let brandColor = '#ffffff';
      let tagColor = '#ffffff';
      let brandY = centerY;
      let tagY = centerY + 40;
      
      if (overlayChoice === 'luxury') {
        // Luxury: Dark overlay, gold borders
        const darkOverlay = new Rect({
          left: centerX, top: centerY, width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT,
          fill: 'rgba(0,0,0,0.4)', originX: 'center', originY: 'center', selectable: false, evented: false
        });
        const goldBorder1 = new Rect({
          left: centerX, top: centerY, width: ARTBOARD_WIDTH - 40, height: ARTBOARD_HEIGHT - 40,
          stroke: 'rgba(212, 175, 55, 0.8)', strokeWidth: 2, fill: 'transparent',
          originX: 'center', originY: 'center', selectable: false, evented: false
        });
        canvas.add(darkOverlay, goldBorder1);
        brandColor = '#ffffff';
        tagColor = '#d4af37';
        brandY = centerY - 10;
        tagY = centerY + 30;
      } 
      else if (overlayChoice === 'minimal') {
        // Minimal: White block in middle
        const whiteBlock = new Rect({
          left: centerX, top: centerY, width: ARTBOARD_WIDTH, height: 120,
          fill: 'rgba(255,255,255,0.9)', originX: 'center', originY: 'center', selectable: false, evented: false
        });
        canvas.add(whiteBlock);
        brandColor = '#222222';
        tagColor = '#666666';
        brandY = centerY - 10;
        tagY = centerY + 30;
      }
      else if (overlayChoice === 'modern') {
        // Modern: Side strip
        const sideStrip = new Rect({
          left: artLeft, top: artTop, width: 80, height: ARTBOARD_HEIGHT,
          fill: 'rgba(0, 168, 255, 0.85)', originX: 'left', originY: 'top', selectable: false, evented: false
        });
        const fadeBlock = new Rect({
          left: artLeft + 80, top: artTop, width: ARTBOARD_WIDTH - 80, height: ARTBOARD_HEIGHT,
          fill: 'rgba(0,0,0,0.3)', originX: 'left', originY: 'top', selectable: false, evented: false
        });
        canvas.add(sideStrip, fadeBlock);
        brandColor = '#ffffff';
        tagColor = '#ffffff';
        brandY = centerY;
        tagY = centerY + 40;
      }

      const title = new Textbox(brand.toUpperCase(), {
        left: overlayChoice === 'modern' ? centerX + 40 : centerX,
        top: brandY,
        width: 300,
        fill: brandColor,
        fontSize: overlayChoice === 'minimal' ? 32 : 28,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: overlayChoice === 'modern' ? centerX + 40 : centerX,
        top: tagY,
        width: 300,
        fill: tagColor,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

      if (imgUrl) {
        FabricImage.fromURL(resolveAssetUrl(imgUrl), { crossOrigin: 'anonymous' }).then((img) => {
          img.set({
            left: centerX, top: centerY, originX: 'center', originY: 'center',
            selectable: false, evented: false, name: 'templateBg'
          });
          // Cover logic
          const scale = Math.max(ARTBOARD_WIDTH / img.width, ARTBOARD_HEIGHT / img.height);
          img.scale(scale);
          canvas.add(img);
          img.sendToBack();
          labelBase.sendToBack();
          canvas.renderAll();
          saveHistoryState();
        }).catch(err => console.error(err));
      }
      return;
    }

    if (isCustomTemplate) {
      labelBase.set({ fill: '#ffffff' });
      
      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: centerY - 30,
        width: 250,
        fill: '#111111',
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: centerY + 30,
        width: 250,
        fill: '#555555',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

      const imgUrl = currentDesign?.base_image_url || currentDesign?.preview_url || currentDesign?.file_path;
      if (imgUrl) {
        FabricImage.fromURL(resolveAssetUrl(imgUrl), { crossOrigin: 'anonymous' }).then((img) => {
          img.set({
            left: centerX,
            top: centerY,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            name: 'templateBg'
          });
          img.scaleToWidth(ARTBOARD_WIDTH);
          canvas.add(img);
          img.sendToBack();
          labelBase.sendToBack();
          canvas.renderAll();
          saveHistoryState();
        }).catch(err => console.error("Error loading custom background image", err));
      }
      return;
    }

    if (style === 'Brandex') {
      const zigzagL1 = new Path('M 10 10 L 50 50 L 10 90 L 50 130 L 10 170 L 50 210 L 10 250 L 50 290', {
        left: artLeft + 40,
        top: artTop + 150,
        stroke: '#ffffff',
        strokeWidth: 4,
        fill: '',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const zigzagL2 = new Path('M 30 10 L 70 50 L 30 90 L 70 130 L 30 170 L 70 210 L 30 250 L 70 290', {
        left: artLeft + 60,
        top: artTop + 150,
        stroke: '#ffffff',
        strokeWidth: 2,
        fill: '',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const zigzagR1 = new Path('M 590 10 L 550 50 L 590 90 L 550 130 L 590 170 L 550 210 L 590 250 L 550 290', {
        left: artLeft + 600,
        top: artTop + 150,
        stroke: '#ffffff',
        strokeWidth: 4,
        fill: '',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const zigzagR2 = new Path('M 570 10 L 530 50 L 570 90 L 530 130 L 570 170 L 530 210 L 570 250 L 530 290', {
        left: artLeft + 580,
        top: artTop + 150,
        stroke: '#ffffff',
        strokeWidth: 2,
        fill: '',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });

      const badge = new Rect({
        left: centerX,
        top: centerY,
        width: 160,
        height: 240,
        rx: 40,
        ry: 40,
        fill: colors.bg,
        stroke: '#ffffff',
        strokeWidth: 3,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        name: 'style_badge'
      });

      canvas.add(zigzagL1, zigzagL2, zigzagR1, zigzagR2, badge);

      const icon = new Textbox('⛵', {
        left: centerX,
        top: artTop + 90,
        width: 160,
        fontSize: 22,
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'logoIcon'
      });

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 120,
        width: 160,
        fill: colors.text,
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const bigLetter = new Textbox((brand[0] || 'B').toUpperCase(), {
        left: centerX,
        top: artTop + 175,
        width: 160,
        fill: colors.text,
        fontSize: 56,
        fontWeight: '900',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'bigLetter'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 235,
        width: 160,
        fill: colors.text,
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      const footerText = new Textbox('NATURAL & PURE', {
        left: centerX,
        top: artTop + 270,
        width: 160,
        fill: colors.text,
        fontSize: 9,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subText'
      });

      canvas.add(icon, title, bigLetter, subtitle, footerText);

    } else if (style === 'Forever') {
      const polygon = new Polygon([
        { x: artLeft, y: artTop },
        { x: artLeft + 288, y: artTop },
        { x: artLeft + 416, y: artTop + ARTBOARD_HEIGHT },
        { x: artLeft, y: artTop + ARTBOARD_HEIGHT }
      ], {
        fill: colors.bg,
        selectable: false,
        evented: false,
      });

      const drops = [
        { cx: 560, cy: 50, r: 12 },
        { cx: 600, cy: 120, r: 8 },
        { cx: 520, cy: 200, r: 15 },
        { cx: 570, cy: 245, r: 10 }
      ].map(d => new Circle({
        left: artLeft + d.cx,
        top: artTop + d.cy,
        radius: d.r,
        fill: 'transparent',
        stroke: '#dcdce8',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      }));

      canvas.add(polygon);
      drops.forEach(d => canvas.add(d));

      const brandVerticalText = brand.toUpperCase().split('').join('\n');
      const title = new Textbox(brandVerticalText, {
        left: artLeft + 130,
        top: artTop + 150,
        width: 60,
        fill: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const taglineVerticalText = tagline.toUpperCase().split('').join('\n');
      const subtitle = new Textbox(taglineVerticalText, {
        left: artLeft + 250,
        top: artTop + 150,
        width: 60,
        fill: colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      const bottomDisclaimer = new Textbox('100% of proceeds go to clean water for children', {
        left: artLeft + 190,
        top: artTop + 315,
        width: 300,
        fill: '#ffffff',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'disclaimerText'
      });

      const verticalInfo = new Textbox('MINERALS ADDED FOR TASTE • 100% RECYCLABLE', {
        left: artLeft + 520,
        top: artTop + 170,
        width: 300,
        fill: '#94a3b8',
        fontSize: 9,
        fontFamily: 'Inter, sans-serif',
        angle: 90,
        selectable: true,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        name: 'verticalInfoText'
      });

      canvas.add(title, subtitle, bottomDisclaimer, verticalInfo);

    } else if (style === 'WaveUp') {
      const ripples = [40, 70, 100].map(r => new Circle({
        left: centerX,
        top: artTop + 140,
        radius: r,
        fill: 'transparent',
        stroke: '#dcdcdc',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      }));
      ripples.forEach(r => canvas.add(r));

      const logoOuter = new Circle({
        left: centerX,
        top: artTop + 130,
        radius: 40,
        fill: '#00a8ff',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const logoBgCut = new Circle({
        left: centerX + 8,
        top: artTop + 122,
        radius: 40,
        fill: '#ebf0f5',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const logoInner = new Circle({
        left: centerX,
        top: artTop + 130,
        radius: 25,
        fill: '#00d2ff',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const logoInnerCut = new Circle({
        left: centerX + 5,
        top: artTop + 125,
        radius: 25,
        fill: '#ebf0f5',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(logoOuter, logoBgCut, logoInner, logoInnerCut);

      const title = new Textbox(brand, {
        left: artLeft + 200,
        top: artTop + 245,
        width: 230,
        fill: '#0b1e50',
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'right',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline, {
        left: artLeft + 440,
        top: artTop + 245,
        width: 230,
        fill: colors.accent || '#00a8ff',
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'left',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      const footerText = new Textbox('OCEAN FRESH DRINKING WATER', {
        left: centerX,
        top: artTop + 285,
        width: 400,
        fill: '#646e78',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subText'
      });

      canvas.add(title, subtitle, footerText);

    } else if (style === 'Fiji') {
      const stripeColors = ['#0a1e50', '#00a8ff', '#ffffff', '#e60028', '#ffd700', '#009650'];
      const stripeW = 640 / stripeColors.length;
      stripeColors.forEach((col, i) => {
        const stripe = new Rect({
          left: artLeft + i * stripeW + stripeW / 2,
          top: artTop + 42.5,
          width: stripeW,
          height: 85,
          fill: col,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(stripe);
      });

      const loveText = new Textbox('Love', {
        left: centerX,
        top: artTop + 115,
        width: ARTBOARD_WIDTH,
        fill: '#e60028',
        fontSize: 26,
        fontFamily: 'Caveat, cursive',
        fontStyle: 'italic',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'loveText'
      });

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 175,
        width: ARTBOARD_WIDTH,
        fill: '#009650',
        fontSize: 48,
        fontWeight: '900',
        fontFamily: 'Montserrat, sans-serif',
        textAlign: 'center',
        shadow: '2px 2px 0px #ffd700, 4px 4px 0px #303030',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 250,
        width: ARTBOARD_WIDTH,
        fill: '#00a8ff',
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(loveText, title, subtitle);

    } else if (style === 'Myst') {
      const greenBlob = new Circle({ left: artLeft + 205, top: artTop + 148, radius: 85, fill: '#009650', scaleY: 0.8, originX: 'center', originY: 'center', selectable: false, evented: false });
      const blueBlob = new Circle({ left: artLeft + 345, top: artTop + 120, radius: 75, fill: '#0a1e50', scaleY: 0.8, originX: 'center', originY: 'center', selectable: false, evented: false });
      const lightBlueBlob = new Circle({ left: artLeft + 160, top: artTop + 188, radius: 60, fill: '#00a8ff', scaleY: 0.8, originX: 'center', originY: 'center', selectable: false, evented: false });
      const lightGreenBlob = new Circle({ left: artLeft + 280, top: artTop + 190, radius: 50, fill: '#73c850', scaleY: 0.8, originX: 'center', originY: 'center', selectable: false, evented: false });
      const cyanBlob = new Circle({ left: artLeft + 235, top: artTop + 76, radius: 45, fill: '#00d2ff', scaleY: 0.8, originX: 'center', originY: 'center', selectable: false, evented: false });
      canvas.add(greenBlob, blueBlob, lightBlueBlob, lightGreenBlob, cyanBlob);

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 143,
        width: 440,
        fill: '#ffffff',
        fontSize: 26,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 190,
        width: 440,
        fill: '#ffffff',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

    } else if (style === 'Pure') {
      const sparklingText = new Textbox('Sparkling.', {
        left: artLeft + 80,
        top: artTop + 45,
        width: 140,
        fill: colors.accent || '#888888',
        fontSize: 14,
        fontFamily: 'Playfair Display, serif',
        textAlign: 'left',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'sparklingText'
      });

      const nzText = new Textbox('N E W   Z E A L A N D', {
        left: centerX,
        top: artTop + 125,
        width: 400,
        fill: colors.accent || '#888888',
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'nzText'
      });

      let mainBrandText = brand.toUpperCase();
      if (mainBrandText.toLowerCase() === 'vistaar' || mainBrandText.toLowerCase() === 'vistaarwater') {
        mainBrandText = 'Pure.';
      } else if (!mainBrandText.endsWith('.')) {
        mainBrandText += '.';
      }

      const title = new Textbox(mainBrandText, {
        left: centerX,
        top: artTop + 185,
        width: 500,
        fill: colors.text,
        fontSize: 54,
        fontWeight: '900',
        fontFamily: 'Playfair Display, serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 245,
        width: 500,
        fill: colors.text,
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      const waiText = new Textbox('WAI PUNA MANAWA', {
        left: centerX,
        top: artTop + 280,
        width: 300,
        fill: colors.accent || '#888888',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'waiText'
      });

      canvas.add(sparklingText, nzText, title, subtitle, waiText);

    } else if (style === 'Reva') {
      const seedRandom = (s) => {
        let mask = 0xffffffff;
        let m_w = (123456789 + s) & mask;
        let m_z = (987654321 - s) & mask;
        return () => {
          m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
          m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
          return (((m_z << 16) + (m_w & 65535)) >>> 0) / 4294967296;
        };
      };
      const rnd = seedRandom(42);
      for (let i = 0; i < 35; i++) {
        const cx = rnd() * (ARTBOARD_WIDTH - 20) + 10;
        const cy = rnd() * (ARTBOARD_HEIGHT - 20) + 10;
        const r = rnd() * 6 + 2;
        const bubble = new Circle({
          left: artLeft + cx,
          top: artTop + cy,
          radius: r,
          fill: 'transparent',
          stroke: 'rgba(255, 255, 255, 0.12)',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(bubble);
      }

      const brandVerticalText = brand.toUpperCase().split('').join('\n');
      const title = new Textbox(brandVerticalText, {
        left: artLeft + 220,
        top: artTop + 150,
        width: 60,
        fill: colors.text,
        fontSize: 26,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const divider = new Rect({
        left: artLeft + 450,
        top: centerY,
        width: 1,
        height: ARTBOARD_HEIGHT - 40,
        fill: 'rgba(255,255,255,0.15)',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(divider);

      const statsList = ['pH LEVEL: 7.8', 'TDS: 120 PPM', 'SODIUM: 2.1 mg/L', 'CALCIUM: 12 mg/L'];
      statsList.forEach((stat, idx) => {
        const statText = new Textbox(stat, {
          left: artLeft + 470,
          top: artTop + 85 + idx * 30,
          width: 150,
          fill: '#ffffff',
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'left',
          selectable: true,
          originX: 'left',
          originY: 'center',
          name: `statText_${idx}`
        });
        canvas.add(statText);
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 310,
        width: 400,
        fill: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

    } else if (style === 'OpenLate') {
      const phiCircle = new Circle({
        left: centerX,
        top: artTop + 115,
        radius: 30,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 3,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const phiLine = new Rect({
        left: centerX,
        top: artTop + 115,
        width: 3,
        height: 90,
        fill: '#ffffff',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(phiCircle, phiLine);

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 220,
        width: 500,
        fill: colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Playfair Display, serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 270,
        width: 500,
        fill: colors.text,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

    } else if (style === 'OneBurger') {
      const phiCircle = new Circle({
        left: centerX,
        top: artTop + 105,
        radius: 25,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 3,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      const phiLine = new Rect({
        left: centerX,
        top: artTop + 105,
        width: 3,
        height: 74,
        fill: '#000000',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(phiCircle, phiLine);

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 195,
        width: 500,
        fill: colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 265,
        width: 500,
        fill: colors.text,
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, subtitle);

    } else if (style === 'Mountain') {
      const mt1 = new Polygon([
        { x: artLeft + 50, y: artTop + ARTBOARD_HEIGHT },
        { x: artLeft + 220, y: artTop + 140 },
        { x: artLeft + 380, y: artTop + ARTBOARD_HEIGHT }
      ], {
        fill: '#0984e3',
        selectable: false,
        evented: false
      });
      const mt1Cap = new Polygon([
        { x: artLeft + 180, y: artTop + 180 },
        { x: artLeft + 220, y: artTop + 140 },
        { x: artLeft + 260, y: artTop + 180 }
      ], {
        fill: '#ffffff',
        selectable: false,
        evented: false
      });

      const mt2 = new Polygon([
        { x: artLeft + 260, y: artTop + ARTBOARD_HEIGHT },
        { x: artLeft + 420, y: artTop + 120 },
        { x: artLeft + 580, y: artTop + ARTBOARD_HEIGHT }
      ], {
        fill: '#00b894',
        selectable: false,
        evented: false
      });
      const mt2Cap = new Polygon([
        { x: artLeft + 380, y: artTop + 165 },
        { x: artLeft + 420, y: artTop + 120 },
        { x: artLeft + 460, y: artTop + 165 }
      ], {
        fill: '#ffffff',
        selectable: false,
        evented: false
      });

      canvas.add(mt1, mt1Cap, mt2, mt2Cap);

      const waterBase = new Rect({
        left: centerX,
        top: artTop + ARTBOARD_HEIGHT - 22.5,
        width: ARTBOARD_WIDTH,
        height: 45,
        fill: '#0984e3',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(waterBase);

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 90,
        width: 500,
        fill: '#0b1e50',
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const cursiveWater = new Textbox('Water', {
        left: centerX,
        top: artTop + 180,
        width: 400,
        fill: '#ffffff',
        fontSize: 50,
        fontFamily: 'Caveat, cursive',
        fontStyle: 'italic',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'cursiveWaterText'
      });

      const subtitle = new Textbox(tagline, {
        left: centerX,
        top: artTop + ARTBOARD_HEIGHT - 22.5,
        width: 500,
        fill: '#ffffff',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(title, cursiveWater, subtitle);
    } else if (style === 'Vivia') {
      const cyanWave = new Path('M 0 340 Q 160 300 320 330 T 640 310 L 640 340 L 0 340 Z', {
        left: artLeft,
        top: artTop,
        fill: '#009688',
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top'
      });
      const whiteWave = new Path('M 0 340 Q 160 320 320 305 T 640 325 L 640 340 L 0 340 Z', {
        left: artLeft,
        top: artTop,
        fill: '#ffffff',
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top'
      });
      const overlayWave = new Path('M 0 340 Q 160 328 320 312 T 640 330 L 640 340 L 0 340 Z', {
        left: artLeft,
        top: artTop,
        fill: '#f0f8ff',
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top'
      });

      canvas.add(cyanWave, whiteWave, overlayWave);

      const subtitleFonte = new Textbox('FONTE', {
        left: centerX,
        top: artTop + 90,
        width: 400,
        fill: '#ffffff',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'fonteText'
      });

      const title = new Textbox(brand.trim() || 'Vivia', {
        left: centerX,
        top: artTop + 145,
        width: 500,
        fill: '#ffffff',
        fontSize: 56,
        fontFamily: 'Caveat, cursive',
        fontStyle: 'italic',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline.toUpperCase(), {
        left: centerX,
        top: artTop + 225,
        width: 500,
        fill: '#ffffff',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(subtitleFonte, title, subtitle);

    } else if (style === 'Melt') {
      const seedRandom = (s) => {
        let mask = 0xffffffff;
        let m_w = (123456789 + s) & mask;
        let m_z = (987654321 - s) & mask;
        return () => {
          m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
          m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
          return (((m_z << 16) + (m_w & 65535)) >>> 0) / 4294967296;
        };
      };
      const rnd = seedRandom(99);
      for (let i = 0; i < 30; i++) {
        const cx = rnd() * (640 - 20) + 10;
        const cy = rnd() * (340 - 20) + 10;
        const r = rnd() * 5 + 2;
        const dropShadow = new Circle({
          left: artLeft + cx + 1,
          top: artTop + cy + 1,
          radius: r,
          fill: '#0a0a0c',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        const dropBody = new Circle({
          left: artLeft + cx,
          top: artTop + cy,
          radius: r,
          fill: '#262a2d',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        const dropHighlight = new Circle({
          left: artLeft + cx - r/3,
          top: artTop + cy - r/3,
          radius: r/4,
          fill: '#ffffff',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(dropShadow, dropBody, dropHighlight);
      }

      const redTag = new Polygon([
        { x: 0, y: 15 },
        { x: 100, y: 11 },
        { x: 96, y: 39 },
        { x: -4, y: 43 }
      ], {
        left: centerX - 50,
        top: artTop + 30,
        fill: '#e60028',
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top'
      });
      canvas.add(redTag);

      const tagText = new Textbox('NUEVA', {
        left: centerX - 2,
        top: artTop + 45,
        width: 100,
        fill: '#ffffff',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        selectable: true,
        angle: -2,
        originX: 'center',
        originY: 'center',
        name: 'tagText'
      });

      const title = new Textbox(brand.toUpperCase(), {
        left: centerX,
        top: artTop + 145,
        width: 500,
        fill: '#ffffff',
        fontSize: 44,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText'
      });

      const subtitle = new Textbox(tagline, {
        left: centerX,
        top: artTop + 225,
        width: 500,
        fill: '#ffffff',
        fontSize: 22,
        fontFamily: 'Caveat, cursive',
        fontStyle: 'italic',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'subtitleText'
      });

      canvas.add(tagText, title, subtitle);

    } else if (style === 'LifeWtrArt1') {
      const polyBlue = new Polygon([
        { x: 0, y: 340 }, { x: 0, y: 270 }, { x: 640, y: 220 }, { x: 640, y: 340 }
      ], { fill: '#2c3e50', left: artLeft, top: artTop, selectable: false, evented: false, originX: 'left', originY: 'top' });
      
      const polyYellow = new Polygon([
        { x: 0, y: 340 }, { x: 0, y: 180 }, { x: 520, y: 280 }, { x: 640, y: 340 }
      ], { fill: '#feca57', left: artLeft, top: artTop, selectable: false, evented: false, originX: 'left', originY: 'top' });
      
      const polyRed = new Polygon([
        { x: 128, y: 340 }, { x: 256, y: 140 }, { x: 640, y: 300 }, { x: 640, y: 340 }
      ], { fill: '#ff6b6b', left: artLeft, top: artTop, selectable: false, evented: false, originX: 'left', originY: 'top' });
      
      const polySky = new Polygon([
        { x: 0, y: 150 }, { x: 640, y: 90 }, { x: 640, y: 220 }, { x: 0, y: 220 }
      ], { fill: '#48dbfb', left: artLeft, top: artTop, selectable: false, evented: false, originX: 'left', originY: 'top' });

      canvas.add(polySky, polyRed, polyYellow, polyBlue);

      const brandBox = new Rect({
        left: centerX,
        top: artTop + 70,
        width: 90,
        height: 90,
        fill: '#000000',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(brandBox);

      const brandParts = brand.toUpperCase().split(/\s+/);
      const p1 = brandParts[0] || 'LIFE';
      const p2 = brandParts[1] || 'WTR';

      const title1 = new Textbox(p1.slice(0, 6), {
        left: centerX,
        top: artTop + 45,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText1'
      });
      const title2 = new Textbox(p2.slice(0, 6), {
        left: centerX,
        top: artTop + 85,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText2'
      });
      canvas.add(title1, title2);

    } else if (style === 'LifeWtrArt2') {
      const cTeal = new Circle({ left: artLeft + 100, top: artTop + 130, radius: 50, fill: '#48dbfb', selectable: false, evented: false, originX: 'center', originY: 'center' });
      const cGreen = new Circle({ left: artLeft + 530, top: artTop + 150, radius: 50, fill: '#009688', selectable: false, evented: false, originX: 'center', originY: 'center' });
      const cRed = new Circle({ left: artLeft + 160, top: artTop + 270, radius: 40, fill: '#ff6b6b', selectable: false, evented: false, originX: 'center', originY: 'center' });

      const ring1 = new Circle({ left: artLeft + 100, top: artTop + 130, radius: 70, fill: 'transparent', stroke: '#e60028', strokeWidth: 2, selectable: false, evented: false, originX: 'center', originY: 'center' });
      const ring2 = new Circle({ left: artLeft + 530, top: artTop + 150, radius: 70, fill: 'transparent', stroke: '#e60028', strokeWidth: 2, selectable: false, evented: false, originX: 'center', originY: 'center' });

      canvas.add(cTeal, cGreen, cRed, ring1, ring2);

      const smile1 = new Path('M 80 140 Q 100 155 120 140', { stroke: '#000000', strokeWidth: 2, fill: '', selectable: false, evented: false, left: artLeft + 85, top: artTop + 135 });
      const eye1a = new Circle({ left: artLeft + 85, top: artTop + 115, radius: 5, fill: '#000000', selectable: false, evented: false });
      const eye1b = new Circle({ left: artLeft + 110, top: artTop + 115, radius: 5, fill: '#000000', selectable: false, evented: false });

      const smile2 = new Path('M 510 160 Q 530 175 550 160', { stroke: '#000000', strokeWidth: 2, fill: '', selectable: false, evented: false, left: artLeft + 515, top: artTop + 155 });
      const eye2a = new Circle({ left: artLeft + 515, top: artTop + 135, radius: 5, fill: '#000000', selectable: false, evented: false });

      canvas.add(smile1, eye1a, eye1b, smile2, eye2a);

      const brandBox = new Rect({
        left: centerX,
        top: artTop + 70,
        width: 90,
        height: 90,
        fill: '#000000',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(brandBox);

      const brandParts = brand.toUpperCase().split(/\s+/);
      const p1 = brandParts[0] || 'LIFE';
      const p2 = brandParts[1] || 'WTR';

      const title1 = new Textbox(p1.slice(0, 6), {
        left: centerX,
        top: artTop + 45,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText1'
      });
      const title2 = new Textbox(p2.slice(0, 6), {
        left: centerX,
        top: artTop + 85,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText2'
      });
      canvas.add(title1, title2);

    } else if (style === 'LifeWtrArt3') {
      const sizes = [240, 200, 160, 120, 80, 40];
      const colorsList = ['#e60028', '#ffd700', '#00a8ff', '#ff007f', '#009650', '#000000'];
      const cDy = centerY + 40;

      sizes.forEach((s, idx) => {
        const diamond = new Polygon([
          { x: centerX, y: cDy - s / 2 },
          { x: centerX + s, y: cDy },
          { x: centerX, y: cDy + s / 2 },
          { x: centerX - s, y: cDy }
        ], {
          fill: colorsList[idx],
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(diamond);
      });

      const brandBox = new Rect({
        left: centerX,
        top: artTop + 70,
        width: 90,
        height: 90,
        fill: '#000000',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(brandBox);

      const brandParts = brand.toUpperCase().split(/\s+/);
      const p1 = brandParts[0] || 'LIFE';
      const p2 = brandParts[1] || 'WTR';

      const title1 = new Textbox(p1.slice(0, 6), {
        left: centerX,
        top: artTop + 45,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText1'
      });
      const title2 = new Textbox(p2.slice(0, 6), {
        left: centerX,
        top: artTop + 85,
        width: 80,
        fill: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        textAlign: 'center',
        selectable: true,
        originX: 'center',
        originY: 'center',
        name: 'titleText2'
      });
      canvas.add(title1, title2);
    }
    
    canvas.renderAll();
  };

  const loadDefaultTemplates = async (canvas) => {
    setLoading(true);
    try {
      const { data } = await designAPI.generate({
        business_name: textDraft || 'YOUR BRAND',
        bottle_text: taglineDraft || 'PREMIUM DRINKING WATER',
        category: 'general',
        bottle_size: activeSize,
        style: 'modern',
        count: 15
      });
      const designs = data.designs || [];
      setGeneratedDesigns(designs);
      if (designs.length > 0) {
        const first = designs[0];
        setSelectedTemplateId(first.id);
        setActiveStyleName(first.style);
        if (first.colors) {
          setLabelColor(first.colors[0]);
          setTextColor(first.colors[1]);
        }
        if (first.business_name) {
          setTextDraft(first.business_name);
        }
        if (first.bottle_text) {
          setTaglineDraft(first.bottle_text);
        }
        const activeCanvas = canvas || fabricRef.current;
        // Skip if this canvas was disposed (React StrictMode double-mount race)
        if (activeCanvas && activeCanvas === fabricRef.current) {
          activeCanvas.activeStyleName = first.style;
          renderStyleVector(
            activeCanvas,
            first.style,
            first.business_name || textDraft,
            first.bottle_text || taglineDraft,
            first.colors?.[0] || labelColor,
            first.colors?.[1] || textColor
          );
          saveHistoryState();
        }
      }
    } catch (err) {
      console.error("Failed to load default templates", err);
      setTemplateLoadError("Failed to fetch templates from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    canvasDisposedRef.current = false;
    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#081224',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    const initialStyle = currentDesign?.style || activeStyleName || 'Brandex';
    canvas.activeStyleName = initialStyle;
    const initialBg = currentDesign?.colors?.[0] || labelColor;
    const initialTxt = currentDesign?.colors?.[1] || textColor;
    
    setActiveStyleName(initialStyle);
    setLabelColor(initialBg);
    setTextColor(initialTxt);

    if (currentDesign?.canvas_json) {
      try {
        canvas.loadFromJSON(JSON.parse(currentDesign.canvas_json)).then(() => {
          canvas.renderAll();
          saveHistoryState();
        });
      } catch (err) {
        console.error("Failed to load saved design canvas:", err);
        renderStyleVector(canvas, initialStyle, textDraft, taglineDraft, initialBg, initialTxt);
        saveHistoryState();
      }
    } else {
      renderStyleVector(canvas, initialStyle, textDraft, taglineDraft, initialBg, initialTxt);
      saveHistoryState();
    }

    // ResizeObserver to prevent offset jump bugs on layout width changes
    const resizeObserver = new ResizeObserver(() => {
      canvas.calcOffset();
    });
    const container = document.querySelector('.canvas-stage');
    if (container) {
      resizeObserver.observe(container);
    }

    const onSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) {
        setSelectedObjectType('none');
        return;
      }
      setSelectedObjectType(activeObject.type || 'object');
      setActiveOpacity(activeObject.opacity !== undefined ? activeObject.opacity : 1);
      
      if (activeObject.type === 'textbox') {
        if (activeObject.name === 'titleText') {
          const cleanText = activeObject.text.includes('\n') ? activeObject.text.replace(/\n/g, '') : activeObject.text;
          setTextDraft(cleanText || '');
        } else if (activeObject.name === 'subtitleText') {
          const cleanText = activeObject.text.includes('\n') ? activeObject.text.replace(/\n/g, '') : activeObject.text;
          setTaglineDraft(cleanText || '');
        }
        setFontSize(Math.round(activeObject.fontSize || 32));
        setTextColor(activeObject.fill || '#55efc4');
        if (activeObject.fontFamily) {
          setActiveFontFamily(activeObject.fontFamily);
        }
      }
    };

    canvas.on('selection:created', onSelection);
    canvas.on('selection:updated', onSelection);
    canvas.on('selection:cleared', () => {
      setSelectedObjectType('none');
      setShowOpacitySlider(false);
    });

    canvas.on('text:changed', (e) => {
      const target = e.target;
      if (!target || target.type !== 'textbox') return;
      const currentStyle = canvas.activeStyleName || activeStyleName;
      if (target.name === 'titleText') {
        const clean = target.text.replace(/\n/g, '');
        setTextDraft(clean);
        const isVertical = currentStyle === 'Forever' || currentStyle === 'Reva';
        if (isVertical) {
          const verticalText = clean.toUpperCase().split('').join('\n');
          if (target.text !== verticalText) {
            target.set({ text: verticalText });
            canvas.requestRenderAll();
          }
        }
      } else if (target.name === 'subtitleText') {
        const clean = target.text.replace(/\n/g, '');
        setTaglineDraft(clean);
        const isVertical = currentStyle === 'Forever';
        if (isVertical) {
          const verticalText = clean.toUpperCase().split('').join('\n');
          if (target.text !== verticalText) {
            target.set({ text: verticalText });
            canvas.requestRenderAll();
          }
        }
      }
    });

    // Smart snap guidelines and guide lines on movement (Canva behavior)
    const SNAP_THRESHOLD = 8;
    canvas.on('object:moving', (options) => {
      const obj = options.target;
      if (!obj || obj.name === 'labelBase') return;

      const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
      const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
      const artCenterL = artLeft + ARTBOARD_WIDTH / 2;
      const artCenterT = artTop + ARTBOARD_HEIGHT / 2;

      const center = obj.getCenterPoint();
      let snappedX = false;
      let snappedY = false;

      if (Math.abs(center.x - artCenterL) < SNAP_THRESHOLD) {
        obj.set({ left: artCenterL });
        snappedX = true;
      }
      if (Math.abs(center.y - artCenterT) < SNAP_THRESHOLD) {
        obj.set({ top: artCenterT });
        snappedY = true;
      }

      // Draw guides
      const objects = canvas.getObjects();
      const existingGuides = objects.filter(o => o.name === 'guideLineX' || o.name === 'guideLineY');
      existingGuides.forEach(g => canvas.remove(g));

      if (snappedX) {
        const guideX = new Rect({
          left: artCenterL - 1,
          top: artTop,
          width: 2,
          height: ARTBOARD_HEIGHT,
          fill: '#e60028', // snapping color guide
          selectable: false,
          evented: false,
          name: 'guideLineX'
        });
        canvas.add(guideX);
      }

      if (snappedY) {
        const guideY = new Rect({
          left: artLeft,
          top: artCenterT - 1,
          width: ARTBOARD_WIDTH,
          height: 2,
          fill: '#e60028',
          selectable: false,
          evented: false,
          name: 'guideLineY'
        });
        canvas.add(guideY);
      }
      canvas.renderAll();
    });

    canvas.on('object:modified', () => {
      const objects = canvas.getObjects();
      const existingGuides = objects.filter(o => o.name === 'guideLineX' || o.name === 'guideLineY');
      existingGuides.forEach(g => canvas.remove(g));
      canvas.renderAll();
    });

    canvas.on('object:added', () => {
      if (isUndoingRedoing.current) return;
      saveHistoryState();
    });
    canvas.on('object:modified', () => {
      if (isUndoingRedoing.current) return;
      saveHistoryState();
    });
    canvas.on('object:removed', () => {
      if (isUndoingRedoing.current) return;
      saveHistoryState();
    });

    if (!currentDesign && (!generatedDesigns || generatedDesigns.length === 0)) {
      loadDefaultTemplates(canvas);
    }

    return () => {
      canvasDisposedRef.current = true;
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [currentDesign, navigate]);

  const unitPrice = useMemo(() => {
    const base = bottleSizes.find((x) => x.id === activeSize)?.price || 20;
    const d500 = parseFloat(siteConfig?.discount_500 || 5) / 100;
    const d1000 = parseFloat(siteConfig?.discount_1000 || 10) / 100;
    const d2000 = parseFloat(siteConfig?.discount_2000 || 15) / 100;

    let discount = 0;
    if (quantity >= 2000) discount = d2000;
    else if (quantity >= 1000) discount = d1000;
    else if (quantity >= 500) discount = d500;
    
    return Math.round(base * (1 - discount) * 100) / 100;
  }, [activeSize, bottleSizes, quantity, siteConfig]);

  const totalPrice = useMemo(() => {
    return Math.round(unitPrice * quantity * 100) / 100;
  }, [unitPrice, quantity]);

  const updateActiveTextbox = (patch) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'textbox') return;
    obj.set(patch);
    canvas.requestRenderAll();
    saveHistoryState();
  };

  const handleReset = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    const initialStyle = currentDesign?.style || activeStyleName || 'Brandex';
    const initialBg = currentDesign?.colors?.[0] || '#0a3d2f';
    const initialTxt = currentDesign?.colors?.[1] || '#55efc4';

    const defaultBrand = currentDesign?.name || 'YOUR BRAND';
    const defaultTagline = 'PREMIUM DRINKING WATER';

    setTextDraft(defaultBrand);
    setTaglineDraft(defaultTagline);
    setLabelColor(initialBg);
    setTextColor(initialTxt);
    setFontSize(44);

    canvas.activeStyleName = initialStyle;
    renderStyleVector(canvas, initialStyle, defaultBrand, defaultTagline, initialBg, initialTxt);
    saveHistoryState();
  };

  const handleUndo = () => {
    const canvas = fabricRef.current;
    const history = historyRef.current;
    if (!canvas || history.index <= 0) return;
    
    isUndoingRedoing.current = true;
    history.index -= 1;
    setHistoryIndex(history.index);
    
    const stateStr = history.stack[history.index];
    canvas.loadFromJSON(JSON.parse(stateStr)).then(() => {
      canvas.renderAll();
      isUndoingRedoing.current = false;
    });
  };

  const handleRedo = () => {
    const canvas = fabricRef.current;
    const history = historyRef.current;
    if (!canvas || history.index >= history.stack.length - 1) return;
    
    isUndoingRedoing.current = true;
    history.index += 1;
    setHistoryIndex(history.index);
    
    const stateStr = history.stack[history.index];
    canvas.loadFromJSON(JSON.parse(stateStr)).then(() => {
      canvas.renderAll();
      isUndoingRedoing.current = false;
    });
  };

  const handleDelete = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.name === 'labelBase') return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    saveHistoryState();
  };

  const handleOpacityChange = (val) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.set({ opacity: parseFloat(val) });
    setActiveOpacity(parseFloat(val));
    canvas.renderAll();
    saveHistoryState();
  };

  const handleLayer = (direction) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.name === 'labelBase') return;
    
    if (direction === 'forward') {
      canvas.bringObjectForward(active);
    } else if (direction === 'backward') {
      const objects = canvas.getObjects();
      const activeIndex = objects.indexOf(active);
      const minIndex = objects.findIndex(obj => obj.name !== 'labelBase');
      if (activeIndex > minIndex && minIndex !== -1) {
        canvas.sendObjectBackwards(active);
      }
    } else if (direction === 'front') {
      canvas.bringToFront(active);
    } else if (direction === 'back') {
      const objects = canvas.getObjects();
      let insertIndex = 0;
      if (objects.some(obj => obj.name === 'labelBase')) insertIndex++;
      canvas.moveTo(active, insertIndex);
    }
    canvas.renderAll();
    saveHistoryState();
  };

  const handleFlip = (axis) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (axis === 'horizontal') {
      active.set({ flipX: !active.flipX });
    } else {
      active.set({ flipY: !active.flipY });
    }
    canvas.renderAll();
    saveHistoryState();
  };

  const handleDuplicate = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.name === 'labelBase') return;
    
    try {
      const cloned = await active.clone();
      cloned.set({
        left: active.left + 25,
        top: active.top + 25,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      saveHistoryState();
    } catch (err) {
      console.error("Failed to duplicate object", err);
    }
  };

  const addTextLayer = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const layer = new Textbox('ADD YOUR TEXT', {
      left: centerX,
      top: centerY,
      width: 360,
      fill: '#ffffff',
      fontSize: 26,
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      editable: true,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(layer);
    canvas.setActiveObject(layer);
    canvas.renderAll();
    saveHistoryState();
  };

  const applyLabelColor = (value) => {
    setLabelColor(value);
    const canvas = fabricRef.current;
    if (!canvas) return;
    const base = canvas.getObjects().find((obj) => obj.name === 'labelBase');
    if (base) {
      base.set({ fill: value });
    }
    const badge = canvas.getObjects().find((obj) => obj.name === 'style_badge');
    if (badge) {
      badge.set({ fill: value });
    }
    canvas.renderAll();
    saveHistoryState();
  };

  const loadTemplateToCanvas = (previewUrl, templateId = null) => {
    const found = (generatedDesigns || []).find((d) => d.id === templateId);
    let style = 'Brandex';
    let bg = labelColor;
    let txt = textColor;
    let brand = textDraft;
    let tagline = taglineDraft;
    
    if (found) {
      style = found.style || 'Brandex';
      setActiveStyleName(style);
      if (found.colors) {
        bg = found.colors[0];
        txt = found.colors[1];
        setLabelColor(bg);
        setTextColor(txt);
      }
      if (found.business_name) {
        brand = found.business_name;
        setTextDraft(brand);
      }
      if (found.bottle_text) {
        tagline = found.bottle_text;
        setTaglineDraft(tagline);
      }
      setSelectedTemplateId(templateId);
    }
    
    const canvas = fabricRef.current;
    if (canvas) {
      canvas.activeStyleName = style;
      renderStyleVector(canvas, style, brand, tagline, bg, txt);
      saveHistoryState();
    }
  };

  const addEmojiLayer = (emoji) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const layer = new Textbox(emoji, {
      left: centerX,
      top: centerY,
      width: 120,
      fontSize: 56,
      textAlign: 'center',
      editable: true,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(layer);
    canvas.setActiveObject(layer);
    canvas.renderAll();
    saveHistoryState();
  };

  const addLogoToCanvas = (url) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        selectable: true,
      });
      img.scaleToWidth(140);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveHistoryState();
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      addLogoToCanvas(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const addRectShape = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const rect = new Rect({
      left: centerX,
      top: centerY,
      width: 120,
      height: 100,
      fill: '#3b52f6',
      strokeWidth: 0,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveHistoryState();
  };

  const addCircleShape = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const circle = new Circle({
      left: centerX,
      top: centerY,
      radius: 60,
      fill: '#10b981',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveHistoryState();
  };

  const addLineShape = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const line = new Rect({
      left: centerX,
      top: centerY,
      width: 320,
      height: 4,
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    saveHistoryState();
  };

  const addTriangleShape = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    const tri = new Triangle({
      left: centerX,
      top: centerY,
      width: 100,
      height: 100,
      fill: '#f39c12',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(tri);
    canvas.setActiveObject(tri);
    canvas.renderAll();
    saveHistoryState();
  };

  const addStarShape = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    // 5-point star polygon
    const outerR = 55, innerR = 25, points = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
    const star = new Polygon(points, {
      left: centerX,
      top: centerY,
      fill: '#e74c3c',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(star);
    canvas.setActiveObject(star);
    canvas.renderAll();
    saveHistoryState();
  };

  const addQrCode = () => {
    if (!qrText.trim()) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const artLeft = (CANVAS_WIDTH - ARTBOARD_WIDTH) / 2;
    const artTop = (CANVAS_HEIGHT - ARTBOARD_HEIGHT) / 2;
    const centerX = artLeft + ARTBOARD_WIDTH / 2;
    const centerY = artTop + ARTBOARD_HEIGHT / 2;
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        selectable: true,
      });
      img.scaleToWidth(100);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveHistoryState();
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'VistaarWater Custom Label Designer',
        text: `My customized label in style ${activeStyleName}!`,
        url: window.location.href,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Editor link copied to clipboard! You can share it.');
    }
  };

  const handleSaveProgress = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const preview = canvas.toDataURL({ format: 'png', quality: 1 });
      const designName = textDraft || currentDesign?.name || 'VistaarWater Design';
      
      const { user } = useStore.getState();
      if (!user) {
        localStorage.setItem('vistaarwater_backup_design', JSON.stringify({
          name: designName,
          canvas_json: JSON.stringify(canvas.toJSON(['name'])),
          preview_url: preview,
          template_id: selectedTemplateId
        }));
        alert('You are not logged in. Your design has been backed up locally to this browser storage.');
        return;
      }
      
      await designAPI.save({
        name: designName,
        canvas_json: JSON.stringify(canvas.toJSON(['name'])),
        preview_url: preview,
        template_id: selectedTemplateId
      });
      alert('Design progress saved successfully to your cloud library!');
    } catch (err) {
      console.error(err);
      alert('Failed to save design. Please login or try again.');
    }
  };

  const handleDownload = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `${textDraft || 'vistaarwater'}-label.png`;
    link.href = dataURL;
    link.click();
  };

  const handlePrint = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label Design - VistaarWater</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #fff;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="${dataURL}" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const triggerAnimate = () => {
    const canvasEl = document.querySelector('.canvas-stage canvas');
    if (canvasEl) {
      gsap.fromTo(canvasEl, 
        { scale: 1 }, 
        { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut" }
      );
    }
  };

  const handleSearchTemplates = async () => {
    if (!templateSearchQuery.trim()) return;
    try {
      const { data } = await designAPI.generate({
        business_name: templateSearchQuery.toUpperCase(),
        bottle_text: "Premium Water",
        category: "general",
        bottle_size: activeSize,
        style: "modern",
        count: 5
      });
      setGeneratedDesigns(data.designs || []);
    } catch (err) {
      console.error("Search templates failed", err);
    }
  };

  const applyFontFamily = (font) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active.type === 'textbox') {
      active.set({ fontFamily: font });
      canvas.requestRenderAll();
      saveHistoryState();
    }
  };

  const generateCodeSnippet = (format, style, brand, tagline, bg, text) => {
    const brandEsc = brand.replace(/"/g, '"');
    const taglineEsc = tagline.replace(/"/g, '"');
    
    let svgCode = '';
    if (style === 'Brandex') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="${bg}" rx="18" />
  <path d="M 10 10 L 50 50 L 10 90 L 50 130 L 10 170 L 50 210 L 10 250 L 50 290" stroke="#fff" stroke-width="4" fill="none" />
  <path d="M 30 10 L 70 50 L 30 90 L 70 130 L 30 170 L 70 210 L 30 250 L 70 290" stroke="#fff" stroke-width="2" fill="none" />
  <path d="M 630 10 L 590 50 L 630 90 L 590 130 L 630 170 L 590 210 L 630 250 L 590 290" stroke="#fff" stroke-width="4" fill="none" />
  <path d="M 610 10 L 570 50 L 610 90 L 570 130 L 610 170 L 570 210 L 610 250 L 590 290" stroke="#fff" stroke-width="2" fill="none" />
  <rect x="240" y="50" width="160" height="240" rx="40" fill="${bg}" stroke="#fff" stroke-width="3" />
  <text x="320" y="85" fill="#fff" font-family="Arial" font-size="16" text-anchor="middle">⛵</text>
  <text x="320" y="115" fill="#fff" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="180" fill="#fff" font-family="Arial" font-size="52" font-weight="900" text-anchor="middle">${brandEsc[0] || 'B'}</text>
  <text x="320" y="235" fill="#fff" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle">${taglineEsc}</text>
  <text x="320" y="265" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">NATURAL &amp; PURE</text>
</svg>`;
    } else if (style === 'Forever') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#fff" rx="18" />
  <polygon points="0,0 288,0 416,340 0,340" fill="${bg}" />
  <ellipse cx="560" cy="50" rx="12" ry="12" stroke="#dcdce8" stroke-width="1" fill="none" />
  <ellipse cx="600" cy="120" rx="8" ry="8" stroke="#dcdce8" stroke-width="1" fill="none" />
  <ellipse cx="520" cy="200" rx="15" ry="15" stroke="#dcdce8" stroke-width="1" fill="none" />
  <text x="100" y="170" fill="#fff" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" transform="rotate(-90, 100, 170)">${brandEsc}</text>
  <text x="240" y="170" fill="#2d3436" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" transform="rotate(-90, 240, 170)">${taglineEsc}</text>
  <text x="180" y="320" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">100% of proceeds go to clean water for children</text>
</svg>`;
    } else if (style === 'WaveUp') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#ebf0f5" rx="18" />
  <circle cx="320" cy="150" r="40" stroke="#dcdcdc" stroke-width="1" fill="none" />
  <circle cx="320" cy="150" r="70" stroke="#dcdcdc" stroke-width="1" fill="none" />
  <circle cx="320" cy="150" r="100" stroke="#dcdcdc" stroke-width="1" fill="none" />
  <circle cx="320" cy="150" r="40" fill="#00a8ff" />
  <circle cx="324" cy="142" r="40" fill="#ebf0f5" />
  <circle cx="320" cy="150" r="25" fill="#00d2ff" />
  <circle cx="325" cy="145" r="25" fill="#ebf0f5" />
  <text x="312" y="270" fill="#0b1e50" font-family="Arial" font-size="22" font-weight="bold" text-anchor="end">${brandEsc}</text>
  <text x="316" y="270" fill="#00a8ff" font-family="Arial" font-size="22" font-weight="bold" text-anchor="start">${taglineEsc}</text>
  <text x="320" y="305" fill="#646e78" font-family="Arial" font-size="12" text-anchor="middle">OCEAN FRESH DRINKING WATER</text>
</svg>`;
    } else if (style === 'Fiji') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#fff" rx="18" />
  <rect x="0" y="0" width="106" height="85" fill="#0a1e50" />
  <rect x="106" y="0" width="106" height="85" fill="#00a8ff" />
  <rect x="212" y="0" width="106" height="85" fill="#fff" />
  <rect x="318" y="0" width="106" height="85" fill="#e60028" />
  <rect x="424" y="0" width="106" height="85" fill="#ffd700" />
  <rect x="530" y="0" width="110" height="85" fill="#009650" />
  <text x="320" y="120" fill="#e60028" font-family="Georgia, serif" font-style="italic" font-size="24" text-anchor="middle">Love</text>
  <text x="322" y="177" fill="#ffd700" font-family="Impact, Charcoal, sans-serif" font-size="46" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="175" fill="#009650" font-family="Impact, Charcoal, sans-serif" font-size="46" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="235" fill="#00a8ff" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else if (style === 'Myst') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#fff" rx="18" />
  <ellipse cx="280" cy="160" rx="97" ry="80" fill="#009650" />
  <ellipse cx="370" cy="140" rx="86" ry="71" fill="#0a1e50" />
  <ellipse cx="250" cy="200" rx="69" ry="57" fill="#00a8ff" />
  <ellipse cx="340" cy="210" rx="57" ry="47" fill="#73c850" />
  <ellipse cx="310" cy="100" rx="51" ry="42" fill="#00d2ff" />
  <text x="300" y="160" fill="#fff" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="300" y="190" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else if (style === 'Pure') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#1a1a1a" rx="18" />
  <text x="50" y="55" fill="#888" font-family="Georgia, serif" font-size="14">Sparkling.</text>
  <text x="320" y="125" fill="#888" font-family="Arial" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="4">N E W   Z E A L A N D</text>
  <text x="320" y="190" fill="#fff" font-family="Georgia, serif" font-size="54" font-weight="900" text-anchor="middle">${brandEsc.endsWith('.') ? brandEsc : brandEsc + '.'}</text>
  <text x="320" y="245" fill="#fff" font-family="Arial" font-size="13" font-weight="bold" text-anchor="middle">${taglineEsc}</text>
  <text x="320" y="280" fill="#888" font-family="Arial" font-size="10" text-anchor="middle">WAI PUNA MANAWA</text>
</svg>`;
    } else if (style === 'Reva') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#1e2022" rx="18" />
  <circle cx="50" cy="80" r="4" fill="none" stroke="rgba(255,255,255,0.15)" />
  <circle cx="150" cy="180" r="6" fill="none" stroke="rgba(255,255,255,0.15)" />
  <circle cx="280" cy="220" r="3" fill="none" stroke="rgba(255,255,255,0.15)" />
  <circle cx="340" cy="90" r="7" fill="none" stroke="rgba(255,255,255,0.15)" />
  <text x="220" y="150" fill="#a3e635" font-family="Arial" font-size="26" font-weight="bold" text-anchor="middle">
    ${brandEsc.toUpperCase().split('').map(c => '<tspan x="220" dy="26">' + c + '</tspan>').join('')}
  </text>
  <line x1="450" y1="20" x2="450" y2="320" stroke="rgba(255,255,255,0.15)" />
  <text x="470" y="90" fill="#fff" font-family="Arial" font-size="10">pH LEVEL: 7.8</text>
  <text x="470" y="120" fill="#fff" font-family="Arial" font-size="10">TDS: 120 PPM</text>
  <text x="470" y="150" fill="#fff" font-family="Arial" font-size="10">SODIUM: 2.1 mg/L</text>
  <text x="470" y="180" fill="#fff" font-family="Arial" font-size="10">CALCIUM: 12 mg/L</text>
  <text x="320" y="310" fill="#fff" font-family="Arial" font-size="11" font-weight="bold" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else if (style === 'OpenLate') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#000" rx="18" />
  <circle cx="320" cy="115" r="30" fill="none" stroke="#fff" stroke-width="3" />
  <line x1="320" y1="70" x2="320" y2="160" stroke="#fff" stroke-width="3" />
  <text x="320" y="220" fill="#fff" font-family="Georgia, serif" font-size="24" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="270" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else if (style === 'OneBurger') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#fff" rx="18" />
  <circle cx="320" cy="105" r="25" fill="none" stroke="#000" stroke-width="3" />
  <line x1="320" y1="68" x2="320" y2="142" stroke="#000" stroke-width="3" />
  <text x="320" y="195" fill="#000" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="265" fill="#000" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else if (style === 'Mountain') {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#dff9fb" rx="18" />
  <polygon points="50,340 220,140 380,340" fill="#0984e3" />
  <polygon points="180,180 220,140 260,180" fill="#fff" />
  <polygon points="260,340 420,120 580,340" fill="#00b894" />
  <polygon points="380,165 420,120 460,165" fill="#fff" />
  <rect x="0" y="295" width="640" height="45" fill="#0984e3" />
  <text x="320" y="90" fill="#0b1e50" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="320" y="190" fill="#fff" font-family="Georgia, serif" font-size="50" font-style="italic" text-anchor="middle">Water</text>
  <text x="320" y="322" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    } else {
      svgCode = `<svg viewBox="0 0 640 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="#fff" rx="18" />
  <ellipse cx="280" cy="160" rx="97" ry="80" fill="#009650" />
  <ellipse cx="370" cy="140" rx="86" ry="71" fill="#0a1e50" />
  <ellipse cx="250" cy="200" rx="69" ry="57" fill="#00a8ff" />
  <ellipse cx="340" cy="210" rx="57" ry="47" fill="#73c850" />
  <ellipse cx="310" cy="100" rx="51" ry="42" fill="#00d2ff" />
  <text x="300" y="160" fill="#fff" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle">${brandEsc}</text>
  <text x="300" y="190" fill="#fff" font-family="Arial" font-size="12" text-anchor="middle">${taglineEsc}</text>
</svg>`;
    }
 
    if (format === 'svg') return svgCode;
 
    if (format === 'react') {
      return `import React from 'react';
 
export default function BrandedLabel() {
  return (
    <div className="w-full max-w-[640px] aspect-[640/340] rounded-2xl overflow-hidden shadow-2xl relative">
      ${svgCode.replace(/class=/g, 'className=')}
    </div>
  );
}`;
    }
 
    if (format === 'html') {
      return `<div class="label-container" style="width: 100%; max-width: 640px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border-radius: 18px; overflow: hidden; position: relative; aspect-ratio: 640/340;">
  ${svgCode}
</div>`;
    }
 
    if (format === 'python') {
      let pyDraw = '';
      if (style === 'Brandex') {
        pyDraw = `    # Draw background and panels
    draw.rectangle([(0, 0), (width, height)], fill="${bg}")
    draw.line([(10, 10), (50, 50), (10, 90), (50, 130), (10, 170), (50, 210), (10, 250), (50, 290)], fill=(255, 255, 255), width=4)
    draw.line([(width-10, 10), (width-50, 50), (width-10, 90), (width-50, 130), (width-10, 170), (width-50, 210), (width-10, 250), (width-50, 290)], fill=(255, 255, 255), width=4)
    
    # Pill Badge
    px1, py1, px2, py2 = (width - 160) // 2, (height - 220) // 2, (width + 160) // 2, (height + 220) // 2
    draw.rounded_rectangle([px1, py1, px2, py2], radius=40, outline=(255, 255, 255), width=3, fill="${bg}")
    draw.text((width // 2, py1 + 25), "Boat Logo", fill=(255, 255, 255), font=font_small, anchor="mm")
    draw.text((width // 2, py1 + 55), "${brandEsc}".upper(), fill=(255, 255, 255), font=font_small, anchor="mm")
    draw.text((width // 2, py1 + 110), "${brandEsc[0] || 'B'}".upper(), fill=(255, 255, 255), font=font_huge, anchor="mm")
    draw.text((width // 2, py1 + 165), "${taglineEsc}".upper(), fill=(255, 255, 255), font=font_title, anchor="mm")`;
      } else if (style === 'Forever') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    draw.polygon([(0, 0), (int(width * 0.45), 0), (int(width * 0.65), height), (0, height)], fill="${bg}")
    for cx, cy, r in [(width - 80, 50, 12), (width - 40, 120, 8), (width - 120, 200, 15)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(220, 230, 242), width=1)
        
    y_start = height * 0.12
    for i, char in enumerate("${brandEsc}".upper()):
        draw.text((int(width * 0.18), int(y_start + i * 26)), char, fill=(255, 255, 255), font=font_title, anchor="mm")
    for i, char in enumerate("${taglineEsc}".upper()):
        draw.text((int(width * 0.38), int(y_start + i * 26)), char, fill=(45, 52, 54), font=font_title, anchor="mm")`;
      } else if (style === 'WaveUp') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(235, 240, 245))
    for r in range(40, 160, 30):
        draw.ellipse([width//2 - r, height//2 - r - 20, width//2 + r, height//2 + r - 20], outline=(220, 228, 235), width=1)
    
    cx, cy = width // 2, height // 2 - 20
    draw.ellipse([cx-40, cy-40, cx+40, cy+40], fill=(0, 168, 255))
    
    draw.text((width // 2 - 12, height - 70), "${brandEsc}", fill=(11, 30, 80), font=font_title, anchor="rm")
    draw.text((width // 2 - 8, height - 70), "${taglineEsc}", fill=(0, 168, 255), font=font_title, anchor="lm")`;
      } else if (style === 'Fiji') {
        pyDraw = `    stripes = [(10, 30, 80), (0, 168, 255), (255, 255, 255), (230, 0, 40), (255, 215, 0), (0, 150, 80)]
    stripe_h, stripe_w = int(height * 0.25), width // len(stripes)
    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    for i, col in enumerate(stripes):
        draw.rectangle([(i * stripe_w, 0), ((i + 1) * stripe_w, stripe_h)], fill=col)
    
    draw.text((width // 2, stripe_h + 35), "Love", fill=(230, 0, 40), font=font_title, anchor="mm")
    draw.text((width // 2, stripe_h + 90), "${brandEsc}".upper(), fill=(0, 150, 80), font=font_huge, anchor="mm")`;
      } else if (style === 'Pure') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill="${bg}")
    draw.text((40, 35), "Sparkling.", fill=(136, 136, 136), font=font_small, anchor="ls")
    draw.text((width // 2, int(height * 0.40)), "N E W   Z E A L A N D", fill=(136, 136, 136), font=font_name, anchor="mm")
    main_name = "${brandEsc}".upper()
    if not main_name.endswith("."):
        main_name += "."
    draw.text((width // 2, int(height * 0.58)), main_name, fill=(255, 255, 255), font=font_huge, anchor="mm")
    draw.text((width // 2, int(height * 0.76)), "${taglineEsc}".upper(), fill=(255, 255, 255), font=font_name, anchor="mm")`;
      } else if (style === 'Reva') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill="${bg}")
    draw.line([(width - 160, 20), (width - 160, height - 20)], fill=(80, 80, 80), width=1)
    for i, char in enumerate("${brandEsc}".upper()[:8]):
        draw.text((int(width * 0.35), int(12*height//100 + i * 26)), char, fill=(163, 230, 53), font=font_title, anchor="mm")
    for i, stat in enumerate(["pH LEVEL: 7.8", "TDS: 120 PPM", "SODIUM: 2.1 mg/L"]):
        draw.text((width - 145, int(height * 0.25 + i * 30)), stat, fill=(255, 255, 255), font=font_name, anchor="lm")
    draw.text((width // 2, height - 20), "${taglineEsc}".upper(), fill=(255, 255, 255), font=font_name, anchor="mm")`;
      } else if (style === 'OpenLate') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(0, 0, 0))
    draw.ellipse([width//2-30, height//2-55, width//2+30, height//2+5], outline=(255, 255, 255), width=3)
    draw.line([(width//2, height//2-70), (width//2, height//2+20)], fill=(255, 255, 255), width=3)
    draw.text((width // 2, int(height * 0.70)), "${brandEsc}".upper(), fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, int(height * 0.85)), "${taglineEsc}".upper(), fill=(255, 255, 255), font=font_name, anchor="mm")`;
      } else if (style === 'OneBurger') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    draw.ellipse([width//2-25, height//2-60, width//2+25, height//2-10], outline=(0, 0, 0), width=3)
    draw.line([(width//2, height//2-72), (width//2, height//2+2)], fill=(0, 0, 0), width=3)
    draw.text((width // 2, int(height * 0.58)), "${brandEsc}".upper(), fill=(0, 0, 0), font=font_title, anchor="mm")
    draw.text((width // 2, int(height * 0.82)), "${taglineEsc}".upper(), fill=(0, 0, 0), font=font_name, anchor="mm")`;
      } else if (style === 'Mountain') {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(223, 249, 251))
    draw.polygon([(50, height), (220, height - 160), (380, height)], fill=(9, 132, 227))
    draw.polygon([(260, height), (420, height - 180), (580, height)], fill=(0, 184, 148))
    draw.rectangle([(0, height - 45), (width, height)], fill=(9, 132, 227))
    draw.text((width // 2, int(height * 0.28)), "${brandEsc}".upper(), fill=(11, 30, 80), font=font_title, anchor="mm")
    draw.text((width // 2, int(height * 0.52)), "Water", fill=(255, 255, 255), font=font_huge, anchor="mm")
    draw.text((width // 2, height - 22), "${taglineEsc}", fill=(255, 255, 255), font=font_name, anchor="mm")`;
      } else {
        pyDraw = `    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    draw.ellipse([width//2 - 40 - 85, height//2 - 10 - 80, width//2 - 40 + 85, height//2 - 10 + 80], fill=(0, 150, 80))
    draw.text((width // 2 - 20, height // 2 - 10), "${brandEsc}".upper(), fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2 - 20, height // 2 + 20), "${taglineEsc}".upper(), fill=(255, 255, 255), font=font_small, anchor="mm")`;
      }
 
      return `from PIL import Image, ImageDraw, ImageFont
 
def generate_label(width=640, height=340):
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font_name = ImageFont.truetype("arial.ttf", 13)
        font_title = ImageFont.truetype("arial.ttf", 22)
        font_huge = ImageFont.truetype("arial.ttf", 46)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except Exception:
        font_name = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_huge = ImageFont.load_default()
        font_small = ImageFont.load_default()
 
${pyDraw}
    img.save("branded_label.png")
    print("Label saved as branded_label.png")
 
if __name__ == "__main__":
    generate_label()`;
    }
  };

  const generateAIDesigns = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await designAPI.generateAI({
        prompt: aiPrompt,
        business_name: currentDesign?.name || 'VISTAARWATER',
        detail_level: aiDetail,
        category: aiCategory,
        style: aiStyle,
        count: 3,
        enhance_prompt: enhancePrompt,
      });
      setGeneratedDesigns(data.designs || []);
      if (data.designs?.[0]?.preview_url) {
        await loadTemplateToCanvas(data.designs[0].preview_url, data.designs[0].id);
      }
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || 'AI design generation failed. Check backend key config.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAndAddToCart = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const preview = canvas.toDataURL({ format: 'png', quality: 1 });
    addToCart({
      design: { ...currentDesign, preview_url: preview, name: textDraft || currentDesign?.name || 'Untitled' },
      productId: activeSize === '250ml' ? 1 : activeSize === '500ml' ? 2 : 3,
      quantity,
      size: activeSize,
      unitPrice,
      canvasData: JSON.stringify(canvas.toJSON(['name'])),
    });
    navigate('/cart');
  };

  return (
    <div className="editor-page canva-mode">
      <header className="studio-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>Back</button>
        <h2>Design Studio Pro ({activeStyleName} Style)</h2>
        <button className="btn btn-primary btn-sm" onClick={saveAndAddToCart}>
          Add to Cart Rs {totalPrice.toLocaleString()}
        </button>
      </header>

      <div className="studio-shell">
        <aside className="studio-navbar">
          <button className={`nav-tab ${activeTool === 'templates' ? 'active' : ''}`} onClick={() => { setActiveTool('templates'); setIsDrawingMode(false); }}>
            <LayoutTemplate size={20} />
            <span>Templates</span>
          </button>
          <button className={`nav-tab ${activeTool === 'text' ? 'active' : ''}`} onClick={() => { setActiveTool('text'); setIsDrawingMode(false); }}>
            <Type size={20} />
            <span>Text</span>
          </button>
          <button className={`nav-tab ${activeTool === 'background' ? 'active' : ''}`} onClick={() => { setActiveTool('background'); setIsDrawingMode(false); }}>
            <Palette size={20} />
            <span>Background</span>
          </button>
          <button className={`nav-tab ${activeTool === 'logo' ? 'active' : ''}`} onClick={() => { setActiveTool('logo'); setIsDrawingMode(false); }}>
            <UploadCloud size={20} />
            <span>Logo</span>
          </button>
          <button className={`nav-tab ${activeTool === 'shape' ? 'active' : ''}`} onClick={() => { setActiveTool('shape'); setIsDrawingMode(false); }}>
            <Square size={20} />
            <span>Shape</span>
          </button>
          <button className={`nav-tab ${activeTool === 'images' ? 'active' : ''}`} onClick={() => { setActiveTool('images'); setIsDrawingMode(false); }}>
            <Images size={20} />
            <span>Images</span>
          </button>
          <button className={`nav-tab ${activeTool === 'videos' ? 'active' : ''}`} onClick={() => { setActiveTool('videos'); setIsDrawingMode(false); }}>
            <Video size={20} />
            <span>Videos</span>
          </button>
          <button className={`nav-tab ${activeTool === 'qrcode' ? 'active' : ''}`} onClick={() => { setActiveTool('qrcode'); setIsDrawingMode(false); }}>
            <QrCode size={20} />
            <span>QR Code</span>
          </button>
          <button className={`nav-tab ${activeTool === 'paint' ? 'active' : ''}`} onClick={() => { setActiveTool('paint'); setIsDrawingMode(true); }}>
            <Brush size={20} />
            <span>Paint</span>
          </button>
          <button className={`nav-tab ${activeTool === 'animate' ? 'active' : ''}`} onClick={() => { setActiveTool('animate'); setIsDrawingMode(false); }}>
            <PlayCircle size={20} />
            <span>Animate</span>
          </button>
          <button className={`nav-tab ${activeTool === 'code' ? 'active' : ''}`} onClick={() => { setActiveTool('code'); setIsDrawingMode(false); }}>
            <Code size={20} />
            <span>Code Export</span>
          </button>
        </aside>

        <aside className="studio-left tool-drawer glass">
          {activeTool === 'templates' && (
            <div className="left-panel-section">
              <h3>Templates Library</h3>
              <div className="drawer-search-box">
                <input 
                  type="text" 
                  placeholder="Vibe search (e.g. Cafe, Gym)" 
                  value={templateSearchQuery} 
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTemplates()}
                />
                <button className="btn btn-secondary btn-sm" onClick={handleSearchTemplates}>Search</button>
              </div>
              
              <div className="template-list">
                {(generatedDesigns || []).map((design) => (
                  <button
                    key={design.id}
                    className={`template-item ${selectedTemplateId === design.id ? 'selected' : ''}`}
                    onClick={() => loadTemplateToCanvas(design.preview_url, design.id)}
                  >
                    <img src={resolveAssetUrl(design.preview_url)} alt={design.name} />
                    <span>{design.name}</span>
                  </button>
                ))}
              </div>
              {templateLoadError && <p className="assistant-note error">{templateLoadError}</p>}
              
              <div className="divider" />
              <h4>AI Generator</h4>
              <textarea
                className="input ai-prompt"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your design vibe..."
              />
              <label className="enhance-toggle-label">
                <input
                  type="checkbox"
                  checked={enhancePrompt}
                  onChange={(e) => setEnhancePrompt(e.target.checked)}
                />
                <span>Enhance prompt with AI</span>
              </label>
              <button className="btn btn-primary btn-sm w-full" disabled={aiLoading} onClick={generateAIDesigns}>
                {aiLoading ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="left-panel-section">
              <h3>Text Settings</h3>
              <button className="btn btn-primary btn-sm w-full mb-3" onClick={addTextLayer}>
                + Add Text Box
              </button>
              
              <label>Font Family</label>
              <select 
                className="input" 
                value={activeFontFamily} 
                onChange={(e) => {
                  setActiveFontFamily(e.target.value);
                  applyFontFamily(e.target.value);
                }}
              >
                <option value="Outfit, sans-serif">Outfit (Default)</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Playfair Display, serif">Playfair Display</option>
                <option value="Montserrat, sans-serif">Montserrat</option>
                <option value="Caveat, cursive">Caveat</option>
              </select>

              <label>Typography Styles</label>
              <div className="flex-row">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => updateActiveTextbox({ fontWeight: 'bold' })}>Bold</button>
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => updateActiveTextbox({ fontStyle: 'italic' })}>Italic</button>
              </div>
              
              <label>Text Alignment</label>
              <div className="flex-row">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => updateActiveTextbox({ textAlign: 'left' })}>Left</button>
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => updateActiveTextbox({ textAlign: 'center' })}>Center</button>
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => updateActiveTextbox({ textAlign: 'right' })}>Right</button>
              </div>
            </div>
          )}

          {activeTool === 'background' && (
            <div className="left-panel-section">
              <h3>Background Backdrop</h3>
              <label>Solid Colors Palette</label>
              <div className="color-palette-grid">
                {['#0a3d2f', '#1a1a2e', '#2d3436', '#0c1445', '#2d1b00', '#1e3a3a', '#0a192f', '#3e2723', '#0f0c29', '#0d0d0d', '#ffffff', '#ebf0f5'].map((color) => (
                  <button 
                    key={color} 
                    className="palette-color-btn" 
                    style={{ backgroundColor: color }} 
                    onClick={() => applyLabelColor(color)}
                    title={color}
                  />
                ))}
              </div>
              <label>Custom Hex Color Picker</label>
              <input type="color" className="w-full h-10 rounded-lg cursor-pointer" value={labelColor} onChange={(e) => applyLabelColor(e.target.value)} />
            </div>
          )}

          {activeTool === 'logo' && (
            <div className="left-panel-section">
              <h3>Branding Logos</h3>
              <p className="assistant-note">Drop or select your brand PNG/SVG logos. Added automatically to the canvas.</p>
              <div className="logo-upload-zone">
                <UploadCloud size={32} />
                <span>Upload Logo File</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          )}

          {activeTool === 'shape' && (
            <div className="left-panel-section">
              <h3>Custom Geometric Elements</h3>
              <div className="shape-adder-grid">
                <button className="shape-btn" onClick={addRectShape}>
                  <Square size={24} />
                  <span>Rectangle</span>
                </button>
                <button className="shape-btn" onClick={addCircleShape}>
                  <div className="circle-shape-mock" />
                  <span>Circle</span>
                </button>
                <button className="shape-btn" onClick={addLineShape}>
                  <div className="line-shape-mock" />
                  <span>Divider Line</span>
                </button>
                <button className="shape-btn" onClick={addTriangleShape}>
                  <div className="triangle-shape-mock" />
                  <span>Triangle</span>
                </button>
                <button className="shape-btn" onClick={addStarShape}>
                  <div className="star-shape-mock" />
                  <span>Star</span>
                </button>
              </div>
            </div>
          )}

          {activeTool === 'images' && (
            <div className="left-panel-section">
              <h3>Stickers &amp; Icons</h3>
              <div className="chip-row">
                {['💧', '⛰️', '🌿', '☀️', '⛵', '⭐', '🌊', '🍋', '🍹', '🍊', '🌱', '🌍'].map((emoji) => (
                  <button key={emoji} className="chip-btn" onClick={() => addEmojiLayer(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'videos' && (
            <div className="left-panel-section">
              <h3>Video Label Mock</h3>
              <p className="assistant-note">Videos are supported for digital smart labels (e.g. dynamic QR loops). Prints static frame cover artwork.</p>
              <div className="mock-video-container">
                <video src="https://assets.mixkit.co/videos/preview/mixkit-splashing-water-in-slow-motion-4188-large.mp4" muted autoPlay loop playinline="true" />
              </div>
            </div>
          )}

          {activeTool === 'qrcode' && (
            <div className="left-panel-section">
              <h3>QR Code Generator</h3>
              <p className="assistant-note">Attach your website, event invitation, or custom link to the product label.</p>
              <input 
                className="input" 
                value={qrText} 
                onChange={(e) => setQrText(e.target.value)} 
                placeholder="https://yourwebsite.com"
              />
              <button className="btn btn-primary btn-sm w-full mt-2" onClick={addQrCode}>
                Insert QR Code
              </button>
            </div>
          )}

          {activeTool === 'paint' && (
            <div className="left-panel-section">
              <h3>Paint Mode</h3>
              <p className="assistant-note">Draw directly on your label using freehand brush strokes (like MS Paint).</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isDrawingMode} onChange={(e) => setIsDrawingMode(e.target.checked)} />
                  <span style={{ fontWeight: 'bold' }}>Enable Paint Brush</span>
                </label>
                
                {isDrawingMode && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>Brush Color</label>
                      <input 
                        type="color" 
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>Brush Size: {brushWidth}px</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={brushWidth}
                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTool === 'animate' && (
            <div className="left-panel-section">
              <h3>Micro-Animations Preview</h3>
              <p className="assistant-note">Test interactive motion transitions for digital displays.</p>
              <button className="btn btn-secondary btn-sm w-full" onClick={triggerAnimate}>
                Play Micro-Animation
              </button>
            </div>
          )}

          {activeTool === 'code' && (
            <div className="left-panel-section code-export-panel">
              <h3>Developer Export</h3>
              <div className="code-format-tabs">
                {['react', 'html', 'svg', 'python'].map((fmt) => (
                  <button
                    key={fmt}
                    className={`fmt-btn ${codeFormat === fmt ? 'active' : ''}`}
                    onClick={() => setCodeFormat(fmt)}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="code-display-wrapper">
                <button
                  className="btn btn-secondary btn-sm copy-btn"
                  onClick={() => {
                    const code = generateCodeSnippet(codeFormat, activeStyleName, textDraft, taglineDraft, labelColor, textColor);
                    navigator.clipboard.writeText(code);
                    alert(`${codeFormat.toUpperCase()} code snippet copied to clipboard!`);
                  }}
                >
                  Copy Snippet
                </button>
                <pre className="code-box">
                  <code>
                    {generateCodeSnippet(codeFormat, activeStyleName, textDraft, taglineDraft, labelColor, textColor)}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </aside>

        <section className="studio-center">
          <div className="studio-workspace">
            {/* Image 1 Header Toolbar */}
            <div className="editor-top-actions-bar">
              <div className="top-actions-left">
                <button className="action-btn" title="Reset Design" onClick={handleReset}>
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
                <div className="btn-divider" />
                <button className="action-btn" title="Undo" onClick={handleUndo} disabled={historyIndex <= 0}>
                  <Undo2 size={16} />
                  <span>Undo</span>
                </button>
                <button className="action-btn" title="Redo" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1}>
                  <Redo2 size={16} />
                  <span>Redo</span>
                </button>
                <div className="btn-divider" />
                <button className="action-btn text-danger" title="Delete Layer" onClick={handleDelete} disabled={selectedObjectType === 'none'}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
              
              <div className="top-actions-right">
                <div className="action-group opacity-group">
                  <button className={`action-btn ${showOpacitySlider ? 'active' : ''}`} title="Opacity" onClick={() => setShowOpacitySlider(!showOpacitySlider)} disabled={selectedObjectType === 'none'}>
                    <Sliders size={16} />
                    <span>Opacity</span>
                  </button>
                  {showOpacitySlider && selectedObjectType !== 'none' && (
                    <div className="opacity-slider-popup glass">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={activeOpacity} 
                        onChange={(e) => handleOpacityChange(e.target.value)} 
                      />
                      <span className="opacity-val">{Math.round(activeOpacity * 100)}%</span>
                    </div>
                  )}
                </div>
                
                <div className="action-group layer-group">
                  <button className="action-btn" title="Layers" disabled={selectedObjectType === 'none'}>
                    <Layers size={16} />
                    <span>Layer</span>
                  </button>
                  {selectedObjectType !== 'none' && (
                    <div className="layer-actions-popup glass">
                      <button onClick={() => handleLayer('front')}>Bring to Front</button>
                      <button onClick={() => handleLayer('forward')}>Bring Forward</button>
                      <button onClick={() => handleLayer('backward')}>Send Backward</button>
                      <button onClick={() => handleLayer('back')}>Send to Back</button>
                    </div>
                  )}
                </div>
                
                <button className="action-btn" title="Flip Horizontal" onClick={() => handleFlip('horizontal')} disabled={selectedObjectType === 'none'}>
                  <FlipHorizontal size={16} />
                  <span>Flip</span>
                </button>
                
                <button className="action-btn" title="Duplicate Layer" onClick={handleDuplicate} disabled={selectedObjectType === 'none'}>
                  <Copy size={16} />
                  <span>Duplicate</span>
                </button>
              </div>
            </div>

            <div className="canvas-stage" style={{ position: 'relative' }}>
              <div className="preview-toggle" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`action-btn ${!previewMode ? 'active' : ''}`} 
                  onClick={() => setPreviewMode(false)}
                  style={{ background: !previewMode ? 'rgba(85, 239, 196, 0.2)' : 'rgba(255,255,255,0.1)' }}
                >
                  <Edit3 size={16} /> 2D Editor
                </button>
                <button 
                  className={`action-btn ${previewMode ? 'active' : ''}`} 
                  onClick={() => {
                    if (fabricRef.current) {
                      setPreviewImageUrl(fabricRef.current.toDataURL({ format: 'png', quality: 1 }));
                    }
                    setPreviewMode(true);
                  }}
                  style={{ background: previewMode ? 'rgba(85, 239, 196, 0.2)' : 'rgba(255,255,255,0.1)' }}
                >
                  <Eye size={16} /> 3D Preview
                </button>
              </div>
              
              <div style={{ display: previewMode ? 'none' : 'block' }}>
                <canvas ref={canvasElRef} />
              </div>
              
              {previewMode && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BottlePreview labelImage={previewImageUrl} bottleSize={activeSize} />
                </div>
              )}
            </div>

            {/* Image 3 Workspace Footer */}
            <div className="editor-footer-bar">
              <button className="footer-btn btn-share" onClick={handleShare}>
                <Share2 size={16} />
                <span>Share</span>
              </button>
              <button className="footer-btn btn-save" onClick={handleSaveProgress}>
                <Save size={16} />
                <span>Save Progress</span>
              </button>
              <button className="footer-btn btn-download" onClick={handleDownload}>
                <Download size={16} />
                <span>Download</span>
              </button>
              <button className="footer-btn btn-print" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="studio-right glass">
          <div className="right-panel-section">
            <h3>Order Details</h3>
            <label>Bottle Size</label>
            <select className="input" value={activeSize} onChange={(e) => setActiveSize(e.target.value)}>
              {bottleSizes.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
            </select>
            <label>Quantity</label>
            <input className="input" type="number" min="50" step="50" value={quantity} onChange={(e) => setQuantity(Math.max(50, Number(e.target.value) || 50))} />
            <div className="price-box">Total Rs {totalPrice.toLocaleString()}</div>
          </div>

          <div className="right-panel-section">
            {selectedObjectType === 'textbox' ? (
              <>
                <h3>Edit Text Element</h3>
                <label>Text Content</label>
                <input
                  className="input"
                  type="text"
                  value={
                    (() => {
                      const activeObj = fabricRef.current?.getActiveObject();
                      if (activeObj && activeObj.type === 'textbox') {
                        return activeObj.text.replace(/\n/g, '');
                      }
                      return '';
                    })()
                  }
                  onChange={(e) => {
                    const canvas = fabricRef.current;
                    const activeObj = canvas?.getActiveObject();
                    if (activeObj && activeObj.type === 'textbox') {
                      const val = e.target.value;
                      const currentStyle = canvas.activeStyleName || activeStyleName;
                      
                      let textToSet = val;
                      if (activeObj.name === 'titleText') {
                        setTextDraft(val);
                        const isVertical = currentStyle === 'Forever' || currentStyle === 'Reva';
                        textToSet = isVertical ? val.toUpperCase().split('').join('\n') : val.toUpperCase();
                        
                        const big = canvas.getObjects().find(o => o.name === 'bigLetter');
                        if (big) {
                          big.set({ text: (val || 'B')[0].toUpperCase() });
                        }
                      } else if (activeObj.name === 'subtitleText') {
                        setTaglineDraft(val);
                        const isVertical = currentStyle === 'Forever';
                        textToSet = isVertical ? val.toUpperCase().split('').join('\n') : val;
                      }
                      
                      activeObj.set({ text: textToSet });
                      canvas.requestRenderAll();
                      saveHistoryState();
                    }
                  }}
                />
                
                <label>Font Size</label>
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={fontSize}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setFontSize(next);
                    const canvas = fabricRef.current;
                    const active = canvas?.getActiveObject();
                    if (active && active.type === 'textbox') {
                      active.set({ fontSize: next });
                      canvas.requestRenderAll();
                      saveHistoryState();
                    }
                  }}
                />

                <label>Text Color</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    const canvas = fabricRef.current;
                    const active = canvas?.getActiveObject();
                    if (active && active.type === 'textbox') {
                      active.set({ fill: e.target.value });
                      canvas.requestRenderAll();
                      saveHistoryState();
                    }
                  }}
                />

                <label>Font Family</label>
                <select 
                  className="input" 
                  value={activeFontFamily} 
                  onChange={(e) => {
                    setActiveFontFamily(e.target.value);
                    applyFontFamily(e.target.value);
                  }}
                >
                  <option value="Outfit, sans-serif">Outfit</option>
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Playfair Display, serif">Playfair Display</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Caveat, cursive">Caveat</option>
                </select>
              </>
            ) : ['rect', 'circle', 'path', 'polygon'].includes(selectedObjectType) ? (
              <>
                <h3>Shape Element</h3>
                <label>Shape Color</label>
                <input
                  type="color"
                  value={
                    (() => {
                      const activeObj = fabricRef.current?.getActiveObject();
                      if (activeObj) {
                        return activeObj.fill || '#3b52f6';
                      }
                      return '#3b52f6';
                    })()
                  }
                  onChange={(e) => {
                    const canvas = fabricRef.current;
                    const active = canvas?.getActiveObject();
                    if (active) {
                      active.set({ fill: e.target.value });
                      canvas.requestRenderAll();
                      saveHistoryState();
                    }
                  }}
                />
              </>
            ) : selectedObjectType === 'image' ? (
              <>
                <h3>Image/Logo Asset</h3>
                <p className="assistant-note">Selected logo/sticker. Adjust opacity, layer depth, or flip using the top action bar.</p>
              </>
            ) : (
              <>
                <h3>Custom Branding</h3>
                <p className="status-row">Active Style: <strong>{activeStyleName}</strong></p>
                <label>Brand Name</label>
                <input
                  className="input"
                  value={textDraft}
                  onChange={(e) => {
                    setTextDraft(e.target.value);
                    const canvas = fabricRef.current;
                    const title = canvas?.getObjects().find((obj) => obj.name === 'titleText');
                    const currentStyle = canvas?.activeStyleName || activeStyleName;
                    if (title) {
                      const isVertical = currentStyle === 'Forever' || currentStyle === 'Reva';
                      const textToSet = isVertical ? e.target.value.toUpperCase().split('').join('\n') : e.target.value.toUpperCase();
                      title.set({ text: textToSet });
                      const big = canvas?.getObjects().find((obj) => obj.name === 'bigLetter');
                      if (big) {
                        big.set({ text: (e.target.value || 'B')[0].toUpperCase() });
                      }
                    }
                    if (['LifeWtrArt1', 'LifeWtrArt2', 'LifeWtrArt3'].includes(currentStyle)) {
                      const brandParts = e.target.value.toUpperCase().split(/\s+/);
                      const p1 = brandParts[0] || 'LIFE';
                      const p2 = brandParts[1] || 'WTR';
                      const t1 = canvas?.getObjects().find((obj) => obj.name === 'titleText1');
                      const t2 = canvas?.getObjects().find((obj) => obj.name === 'titleText2');
                      if (t1) t1.set({ text: p1.slice(0, 6) });
                      if (t2) t2.set({ text: p2.slice(0, 6) });
                    }
                    canvas?.requestRenderAll();
                    saveHistoryState();
                  }}
                />
                <label>Tagline</label>
                <input
                  className="input"
                  value={taglineDraft}
                  onChange={(e) => {
                    setTaglineDraft(e.target.value);
                    const canvas = fabricRef.current;
                    const sub = canvas?.getObjects().find((obj) => obj.name === 'subtitleText');
                    const currentStyle = canvas?.activeStyleName || activeStyleName;
                    if (sub) {
                      const isVertical = currentStyle === 'Forever';
                      const textToSet = isVertical ? e.target.value.toUpperCase().split('').join('\n') : e.target.value;
                      sub.set({ text: textToSet });
                      canvas.requestRenderAll();
                      saveHistoryState();
                    }
                  }}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
