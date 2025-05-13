import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, PieChart, Upload, Download, Filter, Trash2, FileText, Calendar, BarChart } from 'lucide-react';
import _ from 'lodash';
import logo from '../assets/locweldlogo.png'; 

export default function SurfaceDashboard() {
  const [allData, setAllData] = useState([]); // All data from all files
  const [activeData, setActiveData] = useState([]); // Data from selected file
  const [filteredData, setFilteredData] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    failureRate: 0
  });
  const [dailyStats, setDailyStats] = useState([]);
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [headerInfo, setHeaderInfo] = useState({
    date: '',
    time: '',
    surface: ''
  });
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState('/api/placeholder/180/60'); // Placeholder for logo

  useEffect(() => {
    // Add event listeners for drag and drop
    const dropArea = dropAreaRef.current;
    
    if (dropArea) {
      const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };
      
      const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };
      
      const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      };
      
      const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          processFiles(files);
        }
      };
      
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragenter', handleDragEnter);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
      
      return () => {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragenter', handleDragEnter);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      };
    }
  }, []);

  // Extract date, time, and surface from filename
  const extractFileInfo = (filename) => {
    // Pattern for filenames like "060520250805DA_All.log"
    const pattern = /^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})([A-Z]{2}).*$/;
    const match = filename.match(pattern);
    
    if (match) {
      const [, day, month, year, hour, minute, surface] = match;
      return {
        date: `${day}.${month}.${year}`,
        time: `${hour}:${minute}`,
        surface: surface,
        // Add formatted date for grouping
        formattedDate: `${day}.${month}.${year}`
      };
    }
    
    return {
      date: '',
      time: '',
      surface: '',
      formattedDate: ''
    };
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    processFiles(files);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    
    // Filter only .log and .txt files
    const validFiles = fileArray.filter(file => file.name.endsWith('.log') || file.name.endsWith('.txt'));
    
    if (validFiles.length === 0) {
      alert('Lütfen .log veya .txt uzantılı dosyalar seçin.');
      return;
    }
    
    const newLoadedFiles = [...loadedFiles];
    let loadedCount = 0;
    
    validFiles.forEach(file => {
      // Check if file is already loaded
      if (!loadedFiles.some(f => f.name === file.name)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            // Extract JSON data from log file
            const content = e.target.result;
            const jsonMatch = content.match(/\[.*\]/);
            
            if (jsonMatch) {
              const parsedData = JSON.parse(jsonMatch[0]);
              const fileInfo = extractFileInfo(file.name);
              
              const fileData = {
                name: file.name,
                data: parsedData,
                timestamp: new Date().toLocaleString(),
                info: fileInfo
              };
              
              // Add file to loaded files
              newLoadedFiles.push(fileData);
              loadedCount++;
              
              // If this is the first file being loaded, set it as active
              if (loadedFiles.length === 0 && loadedCount === 1) {
                setActiveFileIndex(0);
                setActiveData(parsedData);
                processData(parsedData);
                setHeaderInfo(fileInfo);
              }
              
              // Merge all data
              const allData = _.flatten(newLoadedFiles.map(f => f.data));
              setAllData(allData);
              updateDailyStats(newLoadedFiles);
              setLoadedFiles(newLoadedFiles);
            } else {
              alert(`${file.name} dosyasında geçerli JSON verisi bulunamadı.`);
            }
          } catch (error) {
            console.error('Dosya işleme hatası:', error);
            alert(`${file.name} dosyası işlenirken bir hata oluştu.`);
          }
        };
        reader.readAsText(file);
      } else {
        alert(`${file.name} dosyası zaten yüklü.`);
      }
    });
  };

  const updateDailyStats = (files) => {
    // Group files by date
    const filesByDate = {};
    
    files.forEach(file => {
      const date = file.info.formattedDate;
      if (!date) return;
      
      if (!filesByDate[date]) {
        filesByDate[date] = [];
      }
      filesByDate[date].push(file);
    });
    
    // Calculate stats for each date
    const stats = Object.keys(filesByDate).map(date => {
      const dateFiles = filesByDate[date];
      const allDateData = _.flatten(dateFiles.map(f => f.data));
      
      const total = allDateData.length;
      const passed = allDateData.filter(item => 
        item.ResultHole_OK && item.ResultX_OK && item.ResultY_OK
      ).length;
      const failed = total - passed;
      
      // Group by surface
      const surfaceData = {};
      dateFiles.forEach(file => {
        const surface = file.info.surface;
        if (!surface) return;
        
        if (!surfaceData[surface]) {
          surfaceData[surface] = {
            total: 0,
            passed: 0,
            failed: 0
          };
        }
        
        const surfaceItems = file.data;
        surfaceData[surface].total += surfaceItems.length;
        surfaceData[surface].passed += surfaceItems.filter(item => 
          item.ResultHole_OK && item.ResultX_OK && item.ResultY_OK
        ).length;
        surfaceData[surface].failed = surfaceData[surface].total - surfaceData[surface].passed;
      });
      
      return {
        date,
        total,
        passed,
        failed,
        failureRate: total > 0 ? (failed / total * 100).toFixed(2) : 0,
        surfaces: surfaceData
      };
    });
    
    // Sort by date (newest first)
    stats.sort((a, b) => {
      const dateA = a.date.split('.').reverse().join('');
      const dateB = b.date.split('.').reverse().join('');
      return dateB.localeCompare(dateA);
    });
    
    setDailyStats(stats);
  };

  const processData = (data) => {
    setFilteredData(data);
    
    // Extract unique markers
    const uniqueMarkers = _.uniq(data.map(item => item.Marker));
    setMarkers(uniqueMarkers);
    
    // Calculate statistics
    const total = data.length;
    const passed = data.filter(item => 
      item.ResultHole_OK && item.ResultX_OK && item.ResultY_OK
    ).length;
    const failed = total - passed;
    
    setStats({
      total,
      passed,
      failed,
      failureRate: total > 0 ? (failed / total * 100).toFixed(2) : 0
    });
  };

  const handleMarkerFilter = (marker) => {
    setSelectedMarker(marker);
    
    if (marker === 'all') {
      setFilteredData(activeData);
    } else {
      const filtered = activeData.filter(item => item.Marker === marker);
      setFilteredData(filtered);
    }
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = Object.keys(filteredData[0]).join(',');
    const rows = filteredData.map(item => Object.values(item).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `surface_data_${selectedMarker}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDailyStatsToCSV = () => {
    if (dailyStats.length === 0) return;
    
    // Create CSV content
    const headers = "Date,Total,Passed,Failed,Failure Rate";
    const rows = dailyStats.map(stat => 
      `${stat.date},${stat.total},${stat.passed},${stat.failed},${stat.failureRate}%`
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily_production_stats_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeFile = (index) => {
    const updatedFiles = [...loadedFiles];
    updatedFiles.splice(index, 1);
    setLoadedFiles(updatedFiles);
    
    if (updatedFiles.length === 0) {
      // Reset everything if no files left
      setAllData([]);
      setActiveData([]);
      setFilteredData([]);
      setMarkers([]);
      setActiveFileIndex(null);
      setHeaderInfo({
        date: '',
        time: '',
        surface: ''
      });
      setStats({
        total: 0,
        passed: 0,
        failed: 0,
        failureRate: 0
      });
      setDailyStats([]);
    } else {
      // If the active file was removed, set the first file as active
      if (activeFileIndex === index || activeFileIndex >= updatedFiles.length) {
        selectFile(0);
      } else if (activeFileIndex > index) {
        // If a file before the active one was removed, adjust the index
        selectFile(activeFileIndex - 1);
      }
      
      // Update allData and dailyStats
      const allData = _.flatten(updatedFiles.map(f => f.data));
      setAllData(allData);
      updateDailyStats(updatedFiles);
    }
  };

  const selectFile = (index) => {
    if (index >= 0 && index < loadedFiles.length) {
      setActiveFileIndex(index);
      const selectedFile = loadedFiles[index];
      setActiveData(selectedFile.data);
      processData(selectedFile.data);
      setHeaderInfo(selectedFile.info);
      setSelectedMarker('all'); // Reset marker filter when changing files
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const getFileDisplayName = (fileInfo) => {
    if (fileInfo.date && fileInfo.time && fileInfo.surface) {
      return `${fileInfo.date} ${fileInfo.time} - ${fileInfo.surface} Yüzeyi`;
    }
    return '';
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-4 bg-white p-1 rounded">
            <img 
              src={logo} 
              alt="Şirket Logo" 
              className="h-auto max-h-32 max-w-32"
              //onClick={() => document.getElementById('logoInput').click()}
            />
            <input 
              id="logoInput" 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload} 
              className="hidden" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Locweld Ina-Vision Dashboard</h1>
            <p className="text-sm">Data visualization and analysis tool</p>
          </div>
        </div>
        
        {/* Current file info display */}
        {headerInfo.date && (
          <div className="flex items-center bg-blue-700 px-3 py-1 rounded">
            <Calendar size={16} className="mr-2" />
            <span className="font-medium">{getFileDisplayName(headerInfo)}</span>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="flex-1 p-4 flex">
        {/* Left Sidebar for File Upload */}
        <div className="w-64 bg-white rounded-lg shadow mr-4 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-2">File Manager</h2>
            <div 
              ref={dropAreaRef}
              className={`border-2 border-dashed rounded-lg p-4 text-center mb-3 cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onClick={() => fileInputRef.current.click()}
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">Drag and drop or select files</p>
              <p className="text-xs text-gray-500">.log and .txt files</p>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".log,.txt"
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
            </div>
            
            <button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm flex items-center justify-center"
              onClick={() => fileInputRef.current.click()}
            >
              <FileText size={16} className="mr-1" />
              Dosya Seç
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Loaded files</h3>
            {loadedFiles.length > 0 ? (
              <ul className="space-y-2 max-h-180 overflow-y-auto">
                {loadedFiles.map((file, index) => {
                  const isActive = index === activeFileIndex;
                  const fileInfo = file.info;
                  const displayName = fileInfo.date ? 
                    `${fileInfo.date} - ${fileInfo.surface}` : 
                    file.name.substring(0, 15) + (file.name.length > 15 ? '...' : '');
                  
                  return (
                    <li 
                      key={index} 
                      className={`text-sm p-2 rounded cursor-pointer flex justify-between items-center ${
                        isActive ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => selectFile(index)}
                    >
                      <div className="truncate max-w-40">
                        <div className={`font-medium ${isActive ? 'text-blue-600' : ''}`}>
                          {displayName}
                        </div>
                        <div className="text-xs text-gray-500">{file.data.length} record</div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data loaded yet</p>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Daily Production Summary */}
          {dailyStats.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="flex justify-between items-center px-4 py-3 border-b">
                <h2 className="text-lg font-semibold flex items-center">
                  <BarChart size={20} className="text-blue-500 mr-2" />
                  Daily Production Summary
                </h2>
                <button 
                  onClick={exportDailyStatsToCSV}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm"
                >
                  <Download size={16} />
                  Export Stats
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Production</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surfaces</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyStats.map((day, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CheckCircle size={16} className="text-green-500 mr-1" />
                            <span className="text-sm text-gray-900">{day.passed}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AlertCircle size={16} className="text-red-500 mr-1" />
                            <span className="text-sm text-gray-900">{day.failed}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">%{day.failureRate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {Object.entries(day.surfaces).map(([surface, data], i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1">
                              {surface}: {data.total} pcs
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        
          {activeData.length > 0 && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm">Total log</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm">Successful</p>
                  <div className="flex items-center">
                    <CheckCircle size={20} className="text-green-500 mr-2" />
                    <p className="text-2xl font-semibold">{stats.passed}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm">UnSuccessful</p>
                  <div className="flex items-center">
                    <AlertCircle size={20} className="text-red-500 mr-2" />
                    <p className="text-2xl font-semibold">{stats.failed}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm">Error Rate</p>
                  <div className="flex items-center">
                    <PieChart size={20} className="text-blue-500 mr-2" />
                    <p className="text-2xl font-semibold">%{stats.failureRate}</p>
                  </div>
                </div>
              </div>
              
              {/* Filters and Export */}
              <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center">
                  <Filter size={18} className="text-gray-500 mr-2" />
                  <span className="mr-2 text-sm text-gray-600">Marker Filter:</span>
                  <select 
                    value={selectedMarker}
                    onChange={(e) => handleMarkerFilter(e.target.value)}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="all">All</option>
                    {markers.map(marker => (
                      <option key={marker} value={marker}>{marker}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm mt-2 sm:mt-0"
                >
                  <Download size={16} />
                  Download as CSV
                </button>
              </div>
              
              {/* Data Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marker</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Index</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hole Index</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set Hole</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result Hole</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set X</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result X</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set Y</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result Y</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((item, index) => (
                        <tr key={index} className={!item.ResultHole_OK || !item.ResultX_OK || !item.ResultY_OK ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.Marker}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ParcaSirasi}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.holeindex}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.SetHole}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${!item.ResultHole_OK ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {item.ResultHole}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.ResultHole_OK && item.ResultX_OK && item.ResultY_OK ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Successful
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Unsuccessful
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.SetX}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${!item.ResultX_OK ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {item.ResultX}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.SetY}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${!item.ResultY_OK ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {item.ResultY}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {activeData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg shadow h-64">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No data loaded yet</h3>
              <p className="text-gray-500 max-w-md">Please upload log files from the left side to view the data.</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 p-4 border-t text-center text-sm text-gray-600">
        Locweld-Ina Vision Dashboard &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}