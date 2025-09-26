import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, Upload, AlertCircle } from 'lucide-react';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';

const FindEnquiry = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [indentData, setIndentData] = useState([]);
  const [enquiryData, setEnquiryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [generatedCandidateNo, setGeneratedCandidateNo] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const [formData, setFormData] = useState({
    candidateName: '',
    candidateDOB: '',
    candidatePhone: '',
    candidateEmail: '',
    previousCompany: '',
    jobExperience: '',
    department: '',
    previousPosition: '',
    maritalStatus: '',
    candidatePhoto: null,
    candidateResume: null,
    presentAddress: '',
    aadharNo: '',
    status: 'NeedMore'
  });

  // Google Drive folder ID for file uploads
  const GOOGLE_DRIVE_FOLDER_ID = '1dsC4gXeCZdVGdHeRXOIHRHw9QW08D-tf';

  // Enhanced error handling with retry mechanism
  const fetchWithRetry = async (url, options = {}, maxRetries = MAX_RETRIES) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        console.log(`Attempt ${i + 1} for ${url}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, i) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };

  // Enhanced data fetching with better error handling
  const fetchAllData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);
    
    try {
      console.log('Starting data fetch...');
      
      // Fetch INDENT data with retry mechanism
      const indentResult = await fetchWithRetry(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?sheet=INDENT&action=fetch'
      );
      
      console.log('INDENT data received:', indentResult);
      
      if (indentResult.success && indentResult.data && indentResult.data.length >= 7) {
        const headers = indentResult.data[5]?.map(h => h ? h.trim() : '') || [];
        const dataFromRow7 = indentResult.data.slice(6);
        
        const getIndex = (headerName) => {
          const index = headers.findIndex(h => h === headerName);
          if (index === -1) {
            console.warn(`Header "${headerName}" not found in:`, headers);
          }
          return index;
        };
        
        const processedData = dataFromRow7
          .filter(row => {
            if (!row || row.length === 0) return false;
            
            const statusIndex = getIndex('Status');
            const planned2Index = getIndex('Planned 2');
            const actual2Index = getIndex('Actual 2');
            
            const status = statusIndex !== -1 ? row[statusIndex] : '';
            const planned2 = planned2Index !== -1 ? row[planned2Index] : '';
            const actual2 = actual2Index !== -1 ? row[actual2Index] : '';
            
            return status === 'NeedMore' && planned2 && (!actual2 || actual2 === '');
          })
          .map(row => ({
            id: row[getIndex('Timestamp')] || `temp-${Date.now()}-${Math.random()}`,
            indentNo: row[getIndex('Indent Number')] || '',
            post: row[getIndex('Post')] || '',
            department: row[getIndex('Department')] || '',
            gender: row[getIndex('Gender')] || '',
            prefer: row[getIndex('Prefer')] || '',
            numberOfPost: row[getIndex('Number Of Posts')] || '',
            competitionDate: row[getIndex('Completion Date')] || '',
            socialSite: row[getIndex('Social Site')] || '',
            status: row[getIndex('Status')] || '',
            plannedDate: row[getIndex('Planned 2')] || '',
            actual: row[getIndex('Actual 2')] || '',
            experience: row[getIndex('Experience')] || '',
          }));
        
        // Fetch ENQUIRY data with retry mechanism
        try {
          const enquiryResult = await fetchWithRetry(
            'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?sheet=ENQUIRY&action=fetch'
          );
          
          console.log('ENQUIRY data received:', enquiryResult);
          
          if (enquiryResult.success && enquiryResult.data && enquiryResult.data.length > 0) {
            const enquiryHeaders = enquiryResult.data[5]?.map(h => h ? h.trim() : '') || [];
            const enquiryRows = enquiryResult.data.slice(6);
            
            const getEnquiryIndex = (headerName) => {
              const index = enquiryHeaders.findIndex(h => h === headerName);
              if (index === -1) {
                console.warn(`ENQUIRY Header "${headerName}" not found in:`, enquiryHeaders);
              }
              return index;
            };
            
            // Count completed recruitments per indent number
            const indentRecruitmentCount = {};
            
            enquiryRows.forEach(row => {
              if (row && row[getEnquiryIndex('Timestamp')]) {
                const indentNo = row[getEnquiryIndex('Indent Number')];
                const statusColumn = 27; // Column AB (index 27)
                const statusValue = row[statusColumn];
                
                if (indentNo && statusValue) {
                  indentRecruitmentCount[indentNo] = (indentRecruitmentCount[indentNo] || 0) + 1;
                }
              }
            });
            
            // Filter pending tasks
            const pendingTasks = processedData.filter(task => {
              if (!task.plannedDate || task.actual) return false;
              
              const requiredPosts = parseInt(task.numberOfPost) || 0;
              const completedRecruitments = indentRecruitmentCount[task.indentNo] || 0;
              
              return completedRecruitments < requiredPosts;
            });
            
            setIndentData(pendingTasks);
            
            // Process ENQUIRY data for history tab
            const processedEnquiryData = enquiryRows
              .filter(row => row && row[getEnquiryIndex('Timestamp')])
              .map(row => ({
                id: row[getEnquiryIndex('Timestamp')] || `temp-enq-${Date.now()}-${Math.random()}`,
                indentNo: row[getEnquiryIndex('Indent Number')] || '',
                candidateEnquiryNo: row[getEnquiryIndex('Candidate Enquiry Number')] || '',
                applyingForPost: row[getEnquiryIndex('Applying For the Post')] || '',
                department: row[getEnquiryIndex('Department')] || '',
                candidateName: row[getEnquiryIndex('Candidate Name')] || '',
                candidateDOB: row[getEnquiryIndex('DCB')] || '',
                candidatePhone: row[getEnquiryIndex('Candidate Phone Number')] || '',
                candidateEmail: row[getEnquiryIndex('Candidate Email')] || '',
                previousCompany: row[getEnquiryIndex('Previous Company Name')] || '',
                jobExperience: row[getEnquiryIndex('Job Experience')] || '',
                previousPosition: row[getEnquiryIndex('Previous Position')] || '',
                maritalStatus: row[getEnquiryIndex('Marital Status')] || '',
                candidatePhoto: row[getEnquiryIndex('Candidate Photo')] || '',
                candidateResume: row[19] || '',
                presentAddress: row[getEnquiryIndex('Present Address')] || '',
                aadharNo: row[getEnquiryIndex('Aadhar No')] || ''
              }));
            
            setEnquiryData(processedEnquiryData);
          } else {
            console.warn('ENQUIRY data is empty or invalid');
            setIndentData(processedData.filter(task => task.plannedDate && !task.actual));
            setEnquiryData([]);
          }
        } catch (enquiryError) {
          console.error('Failed to fetch ENQUIRY data:', enquiryError);
          // Continue with INDENT data only
          setIndentData(processedData.filter(task => task.plannedDate && !task.actual));
          setEnquiryData([]);
          toast.error('Warning: Could not load enquiry history');
        }
        
      } else {
        throw new Error('INDENT sheet data is invalid or insufficient');
      }
      
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      
      if (retryCount < MAX_RETRIES) {
        toast.error(`Failed to fetch data. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchAllData(), 2000 * (retryCount + 1));
      } else {
        toast.error('Failed to fetch data after multiple attempts. Please check your connection.');
        setRetryCount(0);
      }
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  // Enhanced file upload with better error handling
  const uploadFileToGoogleDrive = async (file, type) => {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    try {
      console.log(`Starting upload for ${type}:`, file.name);
      
      const base64Data = await fileToBase64(file);
      
      const uploadResult = await fetchWithRetry(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'uploadFile',
            base64Data: base64Data,
            fileName: `${generatedCandidateNo}_${type}_${file.name}`,
            mimeType: file.type,
            folderId: GOOGLE_DRIVE_FOLDER_ID
          }),
        }
      );
      
      if (uploadResult.success && uploadResult.fileUrl) {
        console.log(`Upload successful for ${type}:`, uploadResult.fileUrl);
        return uploadResult.fileUrl;
      } else {
        throw new Error(uploadResult.error || 'File upload failed - no URL returned');
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw new Error(`Failed to upload ${type}: ${error.message}`);
    }
  };

  const generateNextAAPIndentNumber = () => {
    const allIndentNumbers = [
      ...indentData.map(item => item.indentNo),
      ...enquiryData.map(item => item.indentNo)
    ].filter(Boolean);

    let maxAAPNumber = 0;
    
    allIndentNumbers.forEach(indentNo => {
      const match = indentNo.match(/^AAP-(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxAAPNumber) {
          maxAAPNumber = num;
        }
      }
    });

    const nextNumber = maxAAPNumber + 1;
    return `AAP-${String(nextNumber).padStart(2, '0')}`;
  };

  const generateCandidateNumber = () => {
    if (enquiryData.length === 0) {
      return 'ENQ-01';
    }
    
    const lastNumber = enquiryData.reduce((max, enquiry) => {
      if (!enquiry.candidateEnquiryNo) return max;
      
      const match = enquiry.candidateEnquiryNo.match(/ENQ-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    const nextNumber = lastNumber + 1;
    return `ENQ-${String(nextNumber).padStart(2, '0')}`;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const historyData = enquiryData;

  const handleEnquiryClick = (item = null) => {
    let indentNo = '';
    
    if (item) {
      setSelectedItem(item);
      indentNo = item.indentNo;
    } else {
      indentNo = generateNextAAPIndentNumber();
      
      setSelectedItem({
        indentNo: indentNo,
        post: '',
        gender: '',
        prefer: '',
        numberOfPost: '',
        competitionDate: '',
        socialSite: '',
        status: 'NeedMore',
        plannedDate: '',
        actual: '',
        experience: ''
      });
    }

    const candidateNo = generateCandidateNumber();
    setGeneratedCandidateNo(candidateNo);
    setFormData({
      candidateName: '',
      candidateDOB: '',
      candidatePhone: '',
      candidateEmail: '',
      previousCompany: '',
      jobExperience: '',
      department: item ? item.department : '',
      previousPosition: '',
      maritalStatus: '',
      candidatePhoto: null,
      candidateResume: null,
      presentAddress: '',
      aadharNo: '',
      status: 'NeedMore'
    });
    setShowModal(true);
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let photoUrl = '';
      let resumeUrl = '';

      // Upload files with better error handling
      if (formData.candidatePhoto) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadFileToGoogleDrive(formData.candidatePhoto, 'photo');
          toast.success('Photo uploaded successfully!');
        } catch (error) {
          toast.error(`Photo upload failed: ${error.message}`);
          throw error;
        } finally {
          setUploadingPhoto(false);
        }
      }

      if (formData.candidateResume) {
        setUploadingResume(true);
        try {
          resumeUrl = await uploadFileToGoogleDrive(formData.candidateResume, 'resume');
          toast.success('Resume uploaded successfully!');
        } catch (error) {
          toast.error(`Resume upload failed: ${error.message}`);
          throw error;
        } finally {
          setUploadingResume(false);
        }
      }

      // Create timestamp
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const rowData = [
        formattedTimestamp,
        selectedItem.indentNo,
        generatedCandidateNo,
        selectedItem.post,
        formData.candidateName,
        formatDOB(formData.candidateDOB),
        formData.candidatePhone,
        formData.candidateEmail,
        formData.previousCompany || '',
        formData.jobExperience || '',
        formData.department || '',
        formData.previousPosition || '',
        '',
        formData.maritalStatus || '',
        '',
        photoUrl,
        '',
        formData.presentAddress || '',
        formData.aadharNo || '',
        resumeUrl,
      ];

      console.log('Submitting to ENQUIRY sheet:', rowData);

      // Submit to ENQUIRY sheet
      const enquiryResult = await fetchWithRetry(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            sheetName: 'ENQUIRY',
            action: 'insert',
            rowData: JSON.stringify(rowData)
          }),
        }
      );

      console.log('ENQUIRY response:', enquiryResult);

      if (!enquiryResult.success) {
        throw new Error(enquiryResult.error || 'ENQUIRY submission failed');
      }

      // Handle INDENT sheet update if status is Complete
      if (formData.status === 'Complete') {
        // ... existing INDENT update code ...
      }
      
      toast.success('Enquiry submitted successfully!');
      setShowModal(false);
      fetchAllData();

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
      setUploadingResume(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const filteredPendingData = indentData.filter(item => {
    const matchesSearch = item.post?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.candidateEnquiryNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Error display component
  const ErrorDisplay = ({ error, onRetry }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-red-800 font-medium">Error Loading Data</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Find Enquiry</h1>
      </div>

      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={() => {
            setError(null);
            setRetryCount(0);
            fetchAllData();
          }} 
        />
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 bg-white bg-opacity-10 focus:ring-indigo-500 text-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60"
            />
          </div>
        </div>
        <button
          onClick={() => handleEnquiryClick()}
          className="px-3 py-2 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 text-sm"
          disabled={loading}
        >
          New Enquiry
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300 border-opacity-20">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "history"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("history")}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 ">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Indent No. 
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Post 
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Department 
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Prefer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Number Of Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Competition Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading pending enquiries...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPendingData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                          No pending enquiries found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPendingData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEnquiryClick(item)}
                            className="px-3 py-1 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 text-sm"
                          >
                            Enquiry
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.indentNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.post}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.gender}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.prefer || "-"} {item.experience}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.numberOfPost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.competitionDate
                            ? new Date(
                                item.competitionDate
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indent No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enquiry No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resume
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading enquiry history...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                          No enquiry history found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.indentNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateEnquiryNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.applyingForPost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidatePhone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.jobExperience}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidatePhoto ? (
                            <a
                              href={item.candidatePhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateResume ? (
                            <a
                              href={item.candidateResume}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 flex right-4"
              >
                <X size={20} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Indent No. (इंडेंट नंबर)
                  </label>
                  <input
                    type="text"
                    value={selectedItem.indentNo}
                    disabled
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-white bg-opacity-5 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Enquiry No. (उम्मीदवार इन्क्वायरी संख्या)
                  </label>
                  <input
                    type="text"
                    value={generatedCandidateNo}
                    disabled
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-white bg-opacity-5 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Applying For Post (पद के लिए आवेदन)
                  </label>
                  <input
                    type="text"
                    value={selectedItem.post}
                    onChange={(e) => {
                      setSelectedItem((prev) => ({
                        ...prev,
                        post: e.target.value,
                      }));
                    }}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                  />
                </div>
                <div>
  <label className="block text-sm font-medium text-gray-500 mb-1">
    Department (विभाग)
  </label>
  <input
    type="text"
    name="department"
    value={formData.department}
    onChange={handleInputChange}
    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
  />
</div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Name (उम्मीदवार का नाम) *
                  </label>
                  <input
                    type="text"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate DOB (उम्मीदवार की जन्मतिथि)
                  </label>
                  <input
                    type="date"
                    name="candidateDOB"
                    value={formData.candidateDOB}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Phone (उम्मीदवार का फ़ोन) *
                  </label>
                  <input
                    type="tel"
                    name="candidatePhone"
                    value={formData.candidatePhone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Email (उम्मीदवार ईमेल)
                  </label>
                  <input
                    type="email"
                    name="candidateEmail"
                    value={formData.candidateEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Previous Company (पिछली कंपनी)
                  </label>
                  <input
                    type="text"
                    name="previousCompany"
                    value={formData.previousCompany}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Job Experience (काम का अनुभव)
                  </label>
                  <input
                    type="text"
                    name="jobExperience"
                    value={formData.jobExperience}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Previous Position (पिछला पद)
                  </label>
                  <input
                    type="text"
                    name="previousPosition"
                    value={formData.previousPosition}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Marital Status (वैवाहिक स्थिति)
                  </label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Aadhar No. (आधार नं) *
                  </label>
                  <input
                    type="text"
                    name="aadharNo"
                    value={formData.aadharNo}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Current Address (वर्त्तमान पता)
                </label>
                <textarea
                  name="presentAddress"
                  value={formData.presentAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Photo (उम्मीदवार फोटो)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => handleFileChange(e, "candidatePhoto")}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingPhoto ? "Uploading..." : "Upload File"}
                    </label>
                    {formData.candidatePhoto && !uploadingPhoto && (
                      <span className="text-sm text-gray-500 opacity-80">
                        {formData.candidatePhoto.name}
                      </span>
                    )}
                    {uploadingPhoto && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">
                          Uploading photo...
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 10MB. Supports: JPG, JPEG, PNG, PDF, DOC, DOCX
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Candidate Resume (उम्मीदवार का बायोडाटा)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, "candidateResume")}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingResume ? "Uploading..." : "Upload File"}
                    </label>
                    {formData.candidateResume && !uploadingResume && (
                      <span className="text-sm text-gray-500 opacity-80">
                        {formData.candidateResume.name}
                      </span>
                    )}
                    {uploadingResume && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">
                          Uploading resume...
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Status (स्थिति) *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                    required
                  >
                    <option value="NeedMore">Need More </option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 border-opacity-30 rounded-md text-gray-500 hover:bg-white hover:bg-opacity-10"
                  disabled={submitting || uploadingPhoto || uploadingResume}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 flex items-center justify-center"
                  disabled={submitting || uploadingPhoto || uploadingResume}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindEnquiry;