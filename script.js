// TAB切换功能
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        // 移除所有active类
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // 添加active类到当前选中的tab
        tab.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// 正片叠底合成功能
// 元素引用
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const errorMessage = document.getElementById('errorMessage');
const fileInfo = document.getElementById('fileInfo');
const fileCount = document.getElementById('fileCount');
const clearBtn = document.getElementById('clearBtn');
const processBtn = document.getElementById('processBtn');
const invertColorsCheckbox = document.getElementById('invertColors');
const previewContainer = document.getElementById('previewContainer');
const processingInfo = document.getElementById('processingInfo');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const resultCard = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultImage = document.getElementById('resultImage');
const downloadBtn = document.getElementById('downloadBtn');
const processCanvas = document.getElementById('processCanvas');
const ctx = processCanvas.getContext('2d');

// 存储选定的文件
let selectedFiles = [];
let previews = [];
let shouldInvertColors = false;

// 事件监听
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', clearSelection);
invertColorsCheckbox.addEventListener('change', (e) => {
    shouldInvertColors = e.target.checked;
});
processBtn.addEventListener('click', () => processImages(selectedFiles));
downloadBtn.addEventListener('click', downloadResult);

// 拖放事件
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);

// 处理拖动悬停
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
}

// 处理拖动离开
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
}

// 处理文件拖放
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    validateAndProcessFiles(files);
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(fileInput.files);
    validateAndProcessFiles(files);
}

// 验证和处理文件
function validateAndProcessFiles(files) {
    clearError();
    
    // 验证文件数量
    if (files.length < 1 || files.length > 50) {
        showError(`请选择1-50张图片（当前选择了${files.length}张）`);
        return;
    }
    
    // 验证文件格式
    const invalidFiles = files.filter(file => !file.type.match(/image\/(jpe?g|png)/i));
    if (invalidFiles.length > 0) {
        showError('只支持JPG/PNG格式的图片');
        return;
    }
    
    // 存储选定的文件并显示预览
    selectedFiles = files;
    fileCount.textContent = `已选择 ${files.length} 张图片`;
    fileInfo.classList.remove('hidden');
    
    generatePreviews(files);
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    uploadArea.classList.add('error');
}

// 清除错误信息
function clearError() {
    errorMessage.classList.add('hidden');
    uploadArea.classList.remove('error');
}

// 生成图片预览
function generatePreviews(files) {
    // 清除现有预览
    previewContainer.innerHTML = '';
    
    // 释放之前的预览URL
    previews.forEach(url => URL.revokeObjectURL(url));
    previews = [];
    
    // 生成新的预览（最多显示8张）
    const maxPreviews = Math.min(files.length, 8);
    for (let i = 0; i < maxPreviews; i++) {
        const url = URL.createObjectURL(files[i]);
        previews.push(url);
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = `预览图 ${i + 1}`;
        img.className = 'preview-image';
        previewContainer.appendChild(img);
    }
    
    if (files.length > 8) {
        const message = document.createElement('p');
        message.textContent = `...还有${files.length - 8}张图片未显示`;
        message.style.gridColumn = '1 / -1';
        message.style.textAlign = 'center';
        message.style.color = '#666';
        previewContainer.appendChild(message);
    }
}

// 清除选择
function clearSelection() {
    fileInput.value = '';
    selectedFiles = [];
    
    // 释放预览URL
    previews.forEach(url => URL.revokeObjectURL(url));
    previews = [];
    
    fileInfo.classList.add('hidden');
    clearError();
    previewContainer.innerHTML = '';
    processingInfo.classList.add('hidden');
    resultCard.classList.add('hidden');
}

// 加载图像为 Image 对象
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`无法加载图片: ${file.name}`));
        img.src = URL.createObjectURL(file);
    });
}

// 正片叠底算法实现
function multiplyBlend(baseColor, overlayColor) {
    return {
        r: Math.round((baseColor.r * overlayColor.r) / 255),
        g: Math.round((baseColor.g * overlayColor.g) / 255),
        b: Math.round((baseColor.b * overlayColor.b) / 255),
        a: baseColor.a
    };
}

// 色彩反转算法实现
function invertColor(color) {
    return {
        r: 255 - color.r,
        g: 255 - color.g,
        b: 255 - color.b,
        a: color.a
    };
}

// 处理图像
async function processImages(files) {
    if (!files || files.length === 0) {
        showError('请先选择图片');
        return;
    }
    
    try {
        processingInfo.classList.remove('hidden');
        
        // 设置标题和进度文字
        if (shouldInvertColors) {
            resultTitle.textContent = '正片叠底+色彩反转结果';
        } else {
            resultTitle.textContent = '正片叠底结果';
        }
        
        updateProgress('正在加载图片...', 10);
        
        // 加载所有图像
        const images = [];
        for (let i = 0; i < files.length; i++) {
            updateProgress(`加载图片 ${i + 1}/${files.length}...`, 10 + (20 * i / files.length));
            
            try {
                const image = await loadImage(files[i]);
                images.push(image);
            } catch (error) {
                console.error(`处理图片 ${i + 1} 时出错:`, error);
                throw new Error(`加载图片 ${i + 1} 失败: ${error.message || '未知错误'}`);
            }
        }
        
        if (images.length === 0) {
            throw new Error('无法加载任何图片，请检查图片格式是否正确');
        }
        
        updateProgress('正在检查图像尺寸...', 30);
        
        // 检查所有图像尺寸是否相同
        const width = images[0].width;
        const height = images[0].height;
        
        for (let i = 1; i < images.length; i++) {
            if (images[i].width !== width || images[i].height !== height) {
                throw new Error('所有图片的尺寸必须相同');
            }
        }
        
        // 设置Canvas尺寸
        processCanvas.width = width;
        processCanvas.height = height;
        
        updateProgress('开始正片叠底处理...', 40);
        
        // 检查第一张图片是否有透明通道
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(images[0], 0, 0);
        let imgData = ctx.getImageData(0, 0, width, height);
        let pixelData = imgData.data;
        
        // 判断是否有透明通道
        let hasTransparency = false;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] < 255) {
                hasTransparency = true;
                break;
            }
        }
        
        // 逐一处理每张图片
        for (let i = 1; i < images.length; i++) {
            updateProgress(`正在处理第 ${i + 1}/${images.length} 张图片...`, 40 + (40 * i / images.length));
            
            // 绘制叠加图像到临时canvas
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(images[i], 0, 0);
            const overlayData = ctx.getImageData(0, 0, width, height).data;
            
            // 像素级正片叠底处理
            for (let j = 0; j < pixelData.length; j += 4) {
                const baseColor = {
                    r: pixelData[j],
                    g: pixelData[j + 1],
                    b: pixelData[j + 2],
                    a: pixelData[j + 3]
                };
                
                const overlayColor = {
                    r: overlayData[j],
                    g: overlayData[j + 1],
                    b: overlayData[j + 2],
                    a: overlayData[j + 3]
                };
                
                // 如果两个像素都不透明，则进行正片叠底
                if (baseColor.a > 0 && overlayColor.a > 0) {
                    const resultColor = multiplyBlend(baseColor, overlayColor);
                    
                    pixelData[j] = resultColor.r;
                    pixelData[j + 1] = resultColor.g;
                    pixelData[j + 2] = resultColor.b;
                    pixelData[j + 3] = Math.max(baseColor.a, overlayColor.a); // 保留较高的透明度值
                }
                // 如果基础像素透明但叠加像素不透明，使用叠加像素
                else if (baseColor.a === 0 && overlayColor.a > 0) {
                    pixelData[j] = overlayColor.r;
                    pixelData[j + 1] = overlayColor.g;
                    pixelData[j + 2] = overlayColor.b;
                    pixelData[j + 3] = overlayColor.a;
                }
                // 如果叠加像素透明但基础像素不透明，保持基础像素不变
                // 如果两个像素都透明，则保持透明
            }
        }
        
        // 如果选择了色彩反转，在正片叠底完成后应用
        if (shouldInvertColors) {
            updateProgress('正在反转色彩...', 85);
            
            for (let i = 0; i < pixelData.length; i += 4) {
                // 只反转不透明的像素
                if (pixelData[i + 3] > 0) {
                    pixelData[i] = 255 - pixelData[i];         // R
                    pixelData[i + 1] = 255 - pixelData[i + 1]; // G
                    pixelData[i + 2] = 255 - pixelData[i + 2]; // B
                }
            }
        }
        
        updateProgress('生成结果图片...', 95);
        
        // 将处理后的图像数据放回canvas
        ctx.putImageData(imgData, 0, 0);
        
        // 生成结果图像的数据URL，如果有透明通道则使用PNG格式
        const format = hasTransparency ? 'image/png' : 'image/jpeg';
        const base64 = processCanvas.toDataURL(format);
        
        // 显示结果
        resultImage.src = base64;
        resultCard.classList.remove('hidden');
        
        updateProgress('处理完成！', 100);
        setTimeout(() => {
            processingInfo.classList.add('hidden');
        }, 1000);
        
    } catch (error) {
        console.error('处理图片时出错:', error);
        processingInfo.classList.add('hidden');
        showError(error.message || '处理图片时发生错误');
    }
}

// 更新进度
function updateProgress(text, percent) {
    progressText.textContent = text;
    progressBar.style.width = `${percent}%`;
}

// 下载结果图像
function downloadResult() {
    if (!resultImage.src) return;
    
    const link = document.createElement('a');
    link.href = resultImage.src;
    
    // 根据是否反转色彩设置下载文件名和格式
    const fileExt = resultImage.src.startsWith('data:image/png') ? 'png' : 'jpg';
    if (shouldInvertColors) {
        link.download = `正片叠底-色彩反转结果.${fileExt}`;
    } else {
        link.download = `正片叠底结果.${fileExt}`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 图像分割功能
const splitUploadArea = document.getElementById('splitUploadArea');
const splitFileInput = document.getElementById('splitFileInput');
const splitErrorMessage = document.getElementById('splitErrorMessage');
const splitFileInfo = document.getElementById('splitFileInfo');
const splitPreviewImage = document.getElementById('splitPreviewImage');
const totalPiecesRange = document.getElementById('totalPiecesRange');
const totalPiecesValue = document.getElementById('totalPiecesValue');
const piecesRange = document.getElementById('piecesRange');
const piecesValue = document.getElementById('piecesValue');
const splitInvertColors = document.getElementById('splitInvertColors');
const splitBtn = document.getElementById('splitBtn');
const splitClearBtn = document.getElementById('splitClearBtn');
const splitProcessingInfo = document.getElementById('splitProcessingInfo');
const splitProgressText = document.getElementById('splitProgressText');
const splitProgressBar = document.getElementById('splitProgressBar');
const splitResultCard = document.getElementById('splitResultCard');
const splitResultCount = document.getElementById('splitResultCount');
const totalFragmentsCount = document.getElementById('totalFragmentsCount');
const splitResultContainer = document.getElementById('splitResultContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const splitCanvas = document.getElementById('splitCanvas');
const splitCtx = splitCanvas.getContext('2d');

// 存储分割选项和结果
let splitFiles = [];        // 修改为数组，存储多张图片
let splitPreviewUrls = [];  // 修改为数组，存储多张图片的预览URL
let splitResults = [];
let numPieces = 8;        // 分割成多少张图片
let totalFragments = 100; // 总碎片数量
let bgColor = 'white';    // 底片颜色，默认为白色
let shouldInvertSplitColors = false;

// 更新范围滑块的值显示
totalPiecesRange.addEventListener('input', () => {
    totalFragments = parseInt(totalPiecesRange.value);
    totalPiecesValue.textContent = totalFragments;
});

piecesRange.addEventListener('input', () => {
    numPieces = parseInt(piecesRange.value);
    piecesValue.textContent = numPieces;
});

splitInvertColors.addEventListener('change', (e) => {
    shouldInvertSplitColors = e.target.checked;
});

// 背景颜色单选框事件
document.querySelectorAll('input[name="bgColor"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        bgColor = e.target.value;
    });
});

// 事件监听
splitUploadArea.addEventListener('click', () => splitFileInput.click());
splitFileInput.addEventListener('change', handleSplitFileSelect);
splitBtn.addEventListener('click', splitImage);
splitClearBtn.addEventListener('click', clearSplitSelection);
downloadAllBtn.addEventListener('click', downloadAllSplitImages);

// 拖放事件
splitUploadArea.addEventListener('dragover', handleSplitDragOver);
splitUploadArea.addEventListener('dragleave', handleSplitDragLeave);
splitUploadArea.addEventListener('drop', handleSplitDrop);

function handleSplitDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    splitUploadArea.classList.add('drag-over');
}

function handleSplitDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    splitUploadArea.classList.remove('drag-over');
}

function handleSplitDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    splitUploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        validateSplitFiles(files);
    }
}

function handleSplitFileSelect(e) {
    if (splitFileInput.files.length > 0) {
        validateSplitFiles(Array.from(splitFileInput.files));
    }
}

function validateSplitFiles(files) {
    clearSplitError();
    
    // 验证文件格式
    const invalidFiles = files.filter(file => !file.type.match(/image\/(jpe?g|png)/i));
    if (invalidFiles.length > 0) {
        showSplitError('只支持JPG/PNG格式的图片');
        return;
    }
    
    // 存储文件并显示预览
    splitFiles = files;
    
    // 清除之前的预览URL
    splitPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    splitPreviewUrls = [];
    
    // 创建预览区域
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    
    // 最多显示8张预览
    const maxPreviews = Math.min(files.length, 8);
    for (let i = 0; i < maxPreviews; i++) {
        const previewUrl = URL.createObjectURL(files[i]);
        splitPreviewUrls.push(previewUrl);
        
        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = `预览图 ${i + 1}`;
        img.className = 'preview-image';
        previewContainer.appendChild(img);
    }
    
    if (files.length > 8) {
        const message = document.createElement('p');
        message.textContent = `...还有${files.length - 8}张图片未显示`;
        message.style.gridColumn = '1 / -1';
        message.style.textAlign = 'center';
        message.style.color = '#666';
        previewContainer.appendChild(message);
    }
    
    // 替换原有的单图预览区域
    const oldPreviewContainer = document.querySelector('#splitFileInfo .preview-container');
    oldPreviewContainer.parentNode.replaceChild(previewContainer, oldPreviewContainer);
    
    splitFileInfo.classList.remove('hidden');
}

function showSplitError(message) {
    splitErrorMessage.textContent = message;
    splitErrorMessage.classList.remove('hidden');
    splitUploadArea.classList.add('error');
}

function clearSplitError() {
    splitErrorMessage.classList.add('hidden');
    splitUploadArea.classList.remove('error');
}

function clearSplitSelection() {
    splitFileInput.value = '';
    splitFiles = [];
    
    // 清除所有预览URL
    splitPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    splitPreviewUrls = [];
    
    splitFileInfo.classList.add('hidden');
    clearSplitError();
    splitProcessingInfo.classList.add('hidden');
    splitResultCard.classList.add('hidden');
    
    // 清除结果
    splitResults.forEach(result => URL.revokeObjectURL(result.url));
    splitResults = [];
    splitResultContainer.innerHTML = '';
}

function updateSplitProgress(text, percent) {
    splitProgressText.textContent = text;
    splitProgressBar.style.width = `${percent}%`;
}

// 显示分割结果
function displaySplitResults(totalFragmentCount) {
    splitResultContainer.innerHTML = '';
    splitResultCount.textContent = splitResults.length;
    totalFragmentsCount.textContent = totalFragmentCount;
    
    splitResults.forEach(result => {
        const card = document.createElement('div');
        card.className = 'split-image-card';
        
        const img = document.createElement('img');
        img.src = result.url;
        img.className = 'split-image';
        img.alt = `碎片图 ${result.index}`;
        card.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'split-image-info';
        info.textContent = `${result.fileName} - ${result.fragmentCount} 碎片`;
        card.appendChild(info);
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn';
        downloadBtn.textContent = `下载 ${result.index}`;
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = result.url;
            // 使用原始文件名作为下载文件名前缀
            const ext = bgColor === 'transparent' ? 'png' : 'jpg';
            link.download = `${result.fileName}_碎片图${result.index}_碎片数${result.fragmentCount}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        card.appendChild(downloadBtn);
        
        splitResultContainer.appendChild(card);
    });
    
    splitResultCard.classList.remove('hidden');
}

// 优化的分片生成函数 - 确保像素有且仅有出现一次
function generateSimpleFragments(width, height, numPieces, totalFragments) {
    // 创建一个全零的主掩码数组 - 表示图像的每个像素将被分配到哪个碎片
    const mainMask = new Uint8Array(width * height);
    
    // 计算每个图片的碎片数量 - 尽量均匀分配
    const fragmentsPerPiece = Math.floor(totalFragments / numPieces);
    let remainingFragments = totalFragments % numPieces;
    
    // 为每个图片分配碎片数量
    const fragmentAssignments = [];
    for (let i = 0; i < numPieces; i++) {
        let currentFragments = fragmentsPerPiece;
        if (remainingFragments > 0) {
            currentFragments++;
            remainingFragments--;
        }
        fragmentAssignments.push(currentFragments);
    }
    
    // 步骤1: 生成所有碎片区域
    // 使用泊松盘采样算法生成大约totalFragments个点，作为碎片的种子点
    const seeds = generatePoissonPoints(width, height, totalFragments);
    
    // 步骤2: 使用Voronoi图分割整个图像到各个碎片
    // 对每个像素，找到最近的种子点，将其分配给相应的碎片
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let minDist = Infinity;
            let nearestSeed = -1;
            
            // 找到最近的种子点
            for (let i = 0; i < seeds.length; i++) {
                const seed = seeds[i];
                const dist = Math.sqrt(Math.pow(x - seed.x, 2) + Math.pow(y - seed.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    nearestSeed = i;
                }
            }
            
            // 分配像素给找到的碎片（碎片ID从1开始）
            mainMask[idx] = nearestSeed + 1;
        }
    }
    
    // 步骤3: 随机分配碎片到不同的图片中
    // 创建一个包含所有碎片ID的数组
    const fragmentIds = Array.from({ length: seeds.length }, (_, i) => i + 1);
    
    // 随机打乱碎片ID的顺序
    shuffleArray(fragmentIds);
    
    // 为每张图片创建掩码 - 只包含分配给该图片的碎片
    const imageMasks = [];
    let fragmentIdIndex = 0;
    
    for (let pieceIndex = 0; pieceIndex < numPieces; pieceIndex++) {
        const fragmentCount = fragmentAssignments[pieceIndex];
        const pieceMask = new Uint8Array(width * height);
        
        // 收集当前图片的碎片ID
        const currentPieceFragmentIds = [];
        for (let i = 0; i < fragmentCount && fragmentIdIndex < fragmentIds.length; i++) {
            currentPieceFragmentIds.push(fragmentIds[fragmentIdIndex]);
            fragmentIdIndex++;
        }
        
        // 将选定的碎片填充到当前图片的掩码中
        for (let i = 0; i < mainMask.length; i++) {
            const fragmentId = mainMask[i];
            if (currentPieceFragmentIds.includes(fragmentId)) {
                // 分配一个新的本地碎片ID（1到fragmentCount）
                pieceMask[i] = currentPieceFragmentIds.indexOf(fragmentId) + 1;
            }
        }
        
        // 将当前图片的掩码添加到结果中
        imageMasks.push({
            mask: pieceMask,
            fragmentCount: fragmentCount
        });
    }
    
    return imageMasks;
}

// 打乱数组的辅助函数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 使用泊松盘采样生成随机分布的点
function generatePoissonPoints(width, height, numPoints) {
    // 简化版泊松盘采样，确保点之间有最小距离
    const points = [];
    const minDistance = Math.sqrt((width * height) / (numPoints * 2)); // 估算的最小距离
    
    // 先生成少量随机分布的大区域中心点
    const gridSize = Math.ceil(Math.sqrt(numPoints));
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    // 网格中每个单元放置一个随机点
    for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
            if (points.length >= numPoints) break;
            
            // 在网格单元内随机选择一个点
            const px = gx * cellWidth + Math.random() * cellWidth;
            const py = gy * cellHeight + Math.random() * cellHeight;
            
            // 添加抖动以增加不规则性
            const jitter = minDistance * 0.5;
            const jx = (Math.random() * 2 - 1) * jitter;
            const jy = (Math.random() * 2 - 1) * jitter;
            
            const x = Math.max(0, Math.min(width - 1, px + jx));
            const y = Math.max(0, Math.min(height - 1, py + jy));
            
            points.push({ x, y });
        }
    }
    
    // 如果生成的点不够，添加额外的点
    while (points.length < numPoints) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        
        // 检查与现有点的距离
        let tooClose = false;
        for (const point of points) {
            const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            if (dist < minDistance * 0.5) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            points.push({ x, y });
        }
    }
    
    return points.slice(0, numPoints);
}

// 创建分割图像 - 从碎片掩码生成图像
async function createSplitImageFromFragments(sourceImg, fragmentMask, shouldInvert) {
    return new Promise((resolve) => {
        const width = sourceImg.width;
        const height = sourceImg.height;
        
        // 创建画布
        splitCanvas.width = width;
        splitCanvas.height = height;
        
        // 根据选择的底片颜色设置背景
        if (bgColor === 'white') {
            splitCtx.fillStyle = 'white';
            splitCtx.fillRect(0, 0, width, height);
        } else if (bgColor === 'black') {
            splitCtx.fillStyle = 'black';
            splitCtx.fillRect(0, 0, width, height);
        } else {
            // 透明背景
            splitCtx.clearRect(0, 0, width, height);
        }
        
        // 在临时画布上绘制原始图像
        splitCtx.drawImage(sourceImg, 0, 0);
        
        // 获取原始图像数据
        const imgData = splitCtx.getImageData(0, 0, width, height);
        const srcData = imgData.data;
        
        // 创建结果图像
        const resultData = new Uint8ClampedArray(width * height * 4);
        
        // 判断源图像是否包含透明通道
        let hasTransparency = false;
        for (let i = 3; i < srcData.length; i += 4) {
            if (srcData[i] < 255) {
                hasTransparency = true;
                break;
            }
        }
        
        // 根据底片颜色填充背景
        for (let i = 0; i < resultData.length; i += 4) {
            if (bgColor === 'white') {
                resultData[i] = 255;     // R
                resultData[i + 1] = 255; // G
                resultData[i + 2] = 255; // B
                resultData[i + 3] = 255; // A
            } else if (bgColor === 'black') {
                resultData[i] = 0;       // R
                resultData[i + 1] = 0;   // G
                resultData[i + 2] = 0;   // B
                resultData[i + 3] = 255; // A
            } else {
                // 透明背景
                resultData[i] = 0;       // R
                resultData[i + 1] = 0;   // G
                resultData[i + 2] = 0;   // B
                resultData[i + 3] = 0;   // A
            }
        }
        
        // 复制所有碎片的像素
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = y * width + x;
                const dataIndex = pixelIndex * 4;
                
                // 如果像素属于任何碎片，则复制原始图像数据
                if (fragmentMask[pixelIndex] > 0) {
                    resultData[dataIndex] = srcData[dataIndex];         // R
                    resultData[dataIndex + 1] = srcData[dataIndex + 1]; // G
                    resultData[dataIndex + 2] = srcData[dataIndex + 2]; // B
                    // 保持原图像的透明度，除非是全透明像素在透明底片上（保持透明）
                    if (bgColor === 'transparent' && srcData[dataIndex + 3] === 0) {
                        resultData[dataIndex + 3] = 0;  // 保持透明
                    } else {
                        resultData[dataIndex + 3] = 255; // 设为完全不透明
                    }
                }
            }
        }
        
        // 如果需要反转颜色
        if (shouldInvert) {
            for (let i = 0; i < resultData.length; i += 4) {
                // 只反转非透明区域的颜色（即碎片区域）
                if (resultData[i + 3] > 0) {
                    resultData[i] = 255 - resultData[i];         // R
                    resultData[i + 1] = 255 - resultData[i + 1]; // G
                    resultData[i + 2] = 255 - resultData[i + 2]; // B
                }
            }
        }
        
        // 将处理后的数据放回Canvas
        const resultImgData = new ImageData(resultData, width, height);
        splitCtx.putImageData(resultImgData, 0, 0);
        
        // 获取图像数据URL，透明背景时使用PNG格式，否则使用JPG
        const format = bgColor === 'transparent' || hasTransparency ? 'image/png' : 'image/jpeg';
        const dataUrl = splitCanvas.toDataURL(format);
        resolve(dataUrl);
    });
}

// 分割图像主函数
async function splitImage() {
    if (splitFiles.length === 0) {
        showSplitError('请先选择图片');
        return;
    }
    
    try {
        splitProcessingInfo.classList.remove('hidden');
        updateSplitProgress('正在准备处理...', 5);
        
        // 清除之前的结果
        splitResults.forEach(result => URL.revokeObjectURL(result.url));
        splitResults = [];
        
        let totalFileIndex = 0;
        let overallTotalFragmentCount = 0;
        
        // 处理每张图片
        for (const [fileIndex, file] of splitFiles.entries()) {
            updateSplitProgress(`正在处理图片 ${fileIndex + 1}/${splitFiles.length}...`, 
                                10 + (80 * fileIndex / splitFiles.length));
            
            // 加载图像
            const sourceImg = await loadImage(file);
            const width = sourceImg.width;
            const height = sourceImg.height;
            
            // 设置Canvas尺寸
            splitCanvas.width = width;
            splitCanvas.height = height;
            
            // 生成随机形状掩码
            const fragmentMasks = generateSimpleFragments(width, height, numPieces, totalFragments);
            
            // 为每个区域创建图像
            let fileTotalFragmentCount = 0;
            for (let i = 0; i < fragmentMasks.length; i++) {
                updateSplitProgress(
                    `处理图片 ${fileIndex + 1}/${splitFiles.length} - 生成第 ${i + 1}/${numPieces} 张碎片图...`, 
                    10 + (80 * (fileIndex + i/numPieces) / splitFiles.length)
                );
                
                const { mask, fragmentCount } = fragmentMasks[i];
                fileTotalFragmentCount += fragmentCount;
                
                // 创建碎片图像
                const imageUrl = await createSplitImageFromFragments(
                    sourceImg, 
                    mask,
                    shouldInvertSplitColors
                );
                
                // 存储结果
                splitResults.push({
                    index: totalFileIndex + i + 1,
                    url: imageUrl,
                    fragmentCount: fragmentCount,
                    fileName: file.name.replace(/\.[^/.]+$/, "") // 获取文件名（不带扩展名）
                });
            }
            
            totalFileIndex += numPieces;
            overallTotalFragmentCount += fileTotalFragmentCount;
        }
        
        updateSplitProgress('生成预览...', 95);
        
        // 显示结果
        displaySplitResults(overallTotalFragmentCount);
        
        updateSplitProgress('分割完成！', 100);
        setTimeout(() => {
            splitProcessingInfo.classList.add('hidden');
        }, 1000);
        
    } catch (error) {
        console.error('分割图片时出错:', error);
        splitProcessingInfo.classList.add('hidden');
        showSplitError(error.message || '分割图片时发生错误');
    }
}

// 下载所有分割图像
function downloadAllSplitImages() {
    if (splitResults.length === 0) return;
    
    // 创建一个ZIP文件
    const zip = new JSZip();
    
    // 只有在浏览器支持时才使用JSZip
    if (typeof JSZip === 'undefined') {
        // 如果JSZip不可用，退回到逐个下载
        splitResults.forEach((result, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = result.url;
                // 根据底片颜色决定文件扩展名
                const ext = bgColor === 'transparent' ? 'png' : 'jpg';
                link.download = `${result.fileName}_碎片图${result.index}_碎片数${result.fragmentCount}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 500); // 每个下载间隔500毫秒，避免浏览器阻止多次下载
        });
        return;
    }
    
    // 创建图片文件夹
    const imgFolder = zip.folder("分割图片");
    
    // 添加所有图片到zip
    let count = 0;
    splitResults.forEach(result => {
        // 去除Data URL前缀，获取base64数据
        let base64Data;
        if (bgColor === 'transparent') {
            base64Data = result.url.replace(/^data:image\/png;base64,/, "");
        } else {
            base64Data = result.url.replace(/^data:image\/jpeg;base64,/, "");
        }
        
        // 根据底片颜色决定文件扩展名
        const ext = bgColor === 'transparent' ? 'png' : 'jpg';
        imgFolder.file(`${result.fileName}_碎片图${result.index}_碎片数${result.fragmentCount}.${ext}`, base64Data, { base64: true });
        count++;
        
        if (count === splitResults.length) {
            // 生成ZIP文件并下载
            zip.generateAsync({ type: "blob" }).then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = "分割图片.zip";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    });
} 