import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  User,
  Calendar,
  Clock,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Eye,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getDepartmentTickets,
  getDepartmentAttachment,
  updateTicketStatus,
  markTicketAsViewed,
  getNetworkEngineersForDeptAdmin,
  assignTicketToEngineer,
} from '../../service/deptAuthService';
import { useDeptAuth } from '../../context/DeptAuthContext';
import { useNotifications } from '../../context/NotificationContext';

const TicketDetail = () => {
  const { ticketId } = useParams();
  const { deptAdmin } = useDeptAuth();
  const { refreshUnreadTickets } = useNotifications();
  const departmentName =
    typeof deptAdmin?.department === 'object'
      ? deptAdmin?.department?.name
      : deptAdmin?.department;
  const isWatchOnlyDepartment = /^it(\s+department)?$/i.test(departmentName || '');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [attachmentType, setAttachmentType] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [prioritySelection, setPrioritySelection] = useState('normal');
  const [priorityUpdating, setPriorityUpdating] = useState(false);
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [engineers, setEngineers] = useState([]);
  const [previewedCommentIdx, setPreviewedCommentIdx] = useState(null);
  const [previewedCommentUrl, setPreviewedCommentUrl] = useState(null);
  const [previewedCommentType, setPreviewedCommentType] = useState(null);

  const filteredEngineers = useMemo(() => {
    if (!ticket?.raised_by?.building) return engineers;

    const ticketBuilding =
      typeof ticket.raised_by.building === 'object'
        ? ticket.raised_by.building
        : { _id: ticket.raised_by.building, name: ticket.raised_by.building };

    const ticketBuildingId = ticketBuilding?._id;
    const ticketBuildingName =
      typeof ticketBuilding?.name === 'string' ? ticketBuilding.name : null;

    return engineers.filter((engineer) => {
      const locations = Array.isArray(engineer.locations) ? engineer.locations : [];
      return locations.some((loc) => {
        const locBuilding =
          typeof loc.building === 'object'
            ? loc.building
            : { _id: loc.building, name: loc.building };

        const locBuildingId = locBuilding?._id;
        const locBuildingName =
          typeof locBuilding?.name === 'string' ? locBuilding.name : null;

        if (ticketBuildingId && locBuildingId) {
          return String(locBuildingId) === String(ticketBuildingId);
        }

        if (ticketBuildingName && locBuildingName) {
          return (
            ticketBuildingName.toLowerCase().trim() ===
            locBuildingName.toLowerCase().trim()
          );
        }

        return false;
      });
    });
  }, [engineers, ticket]);

  useEffect(() => {
    if (
      selectedEngineerId &&
      !filteredEngineers.some((engineer) => engineer._id === selectedEngineerId)
    ) {
      setSelectedEngineerId('');
    }
  }, [filteredEngineers, selectedEngineerId]);

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        setLoading(true);
        const result = await getDepartmentTickets();
        console.log(result)
        if (result.success) {
          const foundTicket = result.tickets.find(t => t._id === ticketId);
          if (!foundTicket) {
            toast.error('Ticket not found');
            return;
          }
          
          setTicket(foundTicket);
          
          // Mark ticket as viewed
          await markTicketAsViewed(ticketId);
          
          // Refresh unread tickets count
          await refreshUnreadTickets();
        } else {
          toast.error(result.message || 'Failed to fetch ticket details');
        }
      } catch (error) {
        console.error('Error loading ticket details:', error);
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]); // Removed refreshUnreadTickets from dependencies to prevent infinite loop

  useEffect(() => {
    if (ticket?.priority) {
      setPrioritySelection(ticket.priority);
    }
  }, [ticket?.priority]);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        setAssignLoading(true);
        const result = await getNetworkEngineersForDeptAdmin();
        if (result.success) {
          setEngineers(result.engineers || []);
        } else {
          toast.error(result.message || 'Failed to load network engineers');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load network engineers');
      } finally {
        setAssignLoading(false);
      }
    };

    if (assignOpen && engineers.length === 0) {
      fetchEngineers();
    }
  }, [assignOpen, engineers.length]);

  // Clean up attachment URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
      }
      if (previewedCommentUrl) {
        window.URL.revokeObjectURL(previewedCommentUrl);
      }
    };
  }, [attachmentUrl, previewedCommentUrl]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'in_progress':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'resolved':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
      case 'revoked':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  const getPriorityLabel = (priority) => {
    if (!priority) return 'N/A';
    if (priority === 'low') return 'Low';
    if (priority === 'normal') return 'Medium';
    if (priority === 'high') return 'High';
    if (priority === 'urgent') return 'Urgent';
    return priority;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'in_progress':
        return <AlertCircle size={16} />;
      case 'resolved':
        return <AlertCircle size={16} />;
      case 'revoked':
        return <AlertCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const formatAttachmentName = (attachmentName) => {
    if (!attachmentName) return '';
    
    // Split by dash and get the last part (filename)
    const parts = attachmentName.split('-');
    if (parts.length > 1) {
      // Remove the first part (timestamp) and join the rest
      return parts.slice(1).join('-');
    }
    
    // If no dash found, return the original name
    return attachmentName;
  };

  const handleAttachmentClick = async (attachmentName) => {
    try {
      // If the same attachment is clicked again, toggle it off
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
        setAttachmentUrl(null);
        setAttachmentType(null);
        return;
      }

      const result = await getDepartmentAttachment(attachmentName);
      if (!result.success) {
        toast.error(result.message || 'Failed to fetch attachment');
        return;
      }

      const blob = await result.data.blob();
      if (!blob || blob.size === 0) {
        toast.error('Attachment is empty or could not be loaded.');
        return;
      }
      const url = window.URL.createObjectURL(blob);

      // Determine file type based on extension
      const extension = attachmentName.split('.').pop().toLowerCase();
      let type;
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
        type = 'image';
      } else if (extension === 'pdf') {
        type = 'pdf';
      } else {
        type = 'unsupported';
      }

      setAttachmentUrl(url);
      setAttachmentType(type);
    } catch (error) {
      console.error('Attachment preview error:', error);
      toast.error('Failed to fetch attachment');
    }
  };

  const handleDownloadAttachment = async (attachmentName) => {
    try {
      toast.info('Downloading attachment...');
      
      const result = await getDepartmentAttachment(attachmentName);
      
      if (result.success) {
        const blob = await result.data.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = attachmentName; // Use original filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        window.URL.revokeObjectURL(url);
        
        toast.success('Attachment downloaded successfully');
      } else {
        toast.error(result.message || 'Failed to download attachment');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const handlePriorityUpdate = async () => {
    if (!prioritySelection) return toast.error('Please select a priority');
    setPriorityUpdating(true);
    const result = await updateTicketStatus(ticket._id, {
      priority: prioritySelection,
    });
    setPriorityUpdating(false);
    if (result.success) {
      setTicket(result.ticket);
      toast.success('Priority updated successfully');
    } else {
      toast.error(result.message || 'Failed to update priority');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return toast.error('Comment is required');
    setStatusUpdating(true);
    const result = await updateTicketStatus(ticket._id, { comment }, commentAttachment);
    setStatusUpdating(false);
    if (result.success) {
      setTicket(result.ticket);
      setComment('');
      setCommentAttachment(null);
      toast.success('Comment added successfully');
    } else {
      toast.error(result.message || 'Failed to add comment');
    }
  };

  const handleAssignManually = async () => {
    if (!selectedEngineerId) {
      return toast.error('Please select a Network Engineer');
    }
    setAssignSubmitting(true);
    const result = await assignTicketToEngineer(ticket._id, selectedEngineerId);
    setAssignSubmitting(false);
    if (result.success) {
      setTicket(result.ticket);
      toast.success('Ticket assigned successfully');
      setAssignOpen(false);
      setSelectedEngineerId('');
    } else {
      toast.error(result.message || 'Failed to assign ticket');
    }
  };

  const handleCommentAttachmentPreview = async (attachmentName, idx) => {
    if (previewedCommentIdx === idx) {
      // Toggle off
      if (previewedCommentUrl) window.URL.revokeObjectURL(previewedCommentUrl);
      setPreviewedCommentIdx(null);
      setPreviewedCommentUrl(null);
      setPreviewedCommentType(null);
      return;
    }
    try {
      const result = await getDepartmentAttachment(attachmentName);
      if (!result.success) {
        toast.error(result.message || 'Failed to fetch attachment');
        return;
      }
      const blob = await result.data.blob();
      if (!blob || blob.size === 0) {
        toast.error('Attachment is empty or could not be loaded.');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      // Determine file type
      const extension = attachmentName.split('.').pop().toLowerCase();
      let type;
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
        type = 'image';
      } else if (extension === 'pdf') {
        type = 'pdf';
      } else {
        type = 'unsupported';
      }
      setPreviewedCommentIdx(idx);
      setPreviewedCommentUrl(url);
      setPreviewedCommentType(type);
    } catch {
      toast.error('Failed to fetch attachment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dept/tickets"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Tickets
        </Link>
      </div>

      {ticket && (
        <div className="space-y-6">
          {/* Main Ticket Info */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
                <p className="text-gray-600">Ticket ID: {ticket.ticket_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(ticket.status).bg} ${getStatusColor(ticket.status).text} ${getStatusColor(ticket.status).border}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>
            </div>

            {(() => {
              const buildingName =
                typeof ticket.raised_by?.building === 'object'
                  ? ticket.raised_by?.building?.name
                  : ticket.raised_by?.building;
              const floorValue = ticket.raised_by?.floor;
              const roomValue = ticket.raised_by?.lab_no || ticket.raised_by?.lab;
              const assignedResolver =
                typeof ticket.assigned_to === 'object'
                  ? ticket.assigned_to?.name
                  : ticket.assigned_to;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="font-medium">Building:</span>
                          <span>{buildingName || 'N/A'}</span>
                        </div>
                        <span className="text-gray-400">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Floor:</span>
                          <span>{floorValue ?? 'N/A'}</span>
                        </div>
                        <span className="text-gray-400">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Lab:</span>
                          <span>{roomValue ?? 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">From Department</h3>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <span className="text-gray-900">{ticket.from_department}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">To Department</h3>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <span className="text-gray-900">{ticket.to_department?.name || ticket.to_department}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Resolver</h3>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-900">{assignedResolver || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Created</h3>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-900">
                          {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Updated</h3>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-900">
                          {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()} at {new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Priority</h3>
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-gray-400" />
                        <span className="text-gray-900">{getPriorityLabel(ticket.priority)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Requester Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requester Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-900 font-medium">{ticket.raised_by?.name}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{ticket.raised_by?.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {ticket.raised_by?.phone && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-900">{ticket.raised_by.phone}</span>
                    </div>
                  </div>
                )}
                
                {ticket.raised_by?.department && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-900">{ticket.raised_by.department}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachment && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{formatAttachmentName(ticket.attachment)}</p>
                      <p className="text-sm text-gray-500">Click to preview or download</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAttachmentClick(ticket.attachment)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownloadAttachment(ticket.attachment)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>

                {attachmentUrl && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    {attachmentType === 'image' && (
                      <div className="text-center">
                        <img
                          src={attachmentUrl}
                          alt="Attachment"
                          className="max-w-full h-auto rounded-lg border border-gray-200 mx-auto"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                    )}
                    {attachmentType === 'pdf' && (
                      <div className="text-center">
                        <iframe
                          src={attachmentUrl}
                          title="Attachment PDF"
                          className="w-full h-96 border border-gray-200 rounded-lg"
                        />
                      </div>
                    )}
                    {attachmentType === 'unsupported' && (
                      <div className="text-center">
                        <p className="text-sm text-red-600 mb-2">
                          This file type is not supported for preview.
                        </p>
                        <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                          <FileText size={32} className="text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Please download the file to view it.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment, idx) => (
                  <div key={comment._id || idx} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{comment.by === 'departmental-admin' ? 'Department Admin' : 'Employee'}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.at).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700">{comment.text}</p>
                    {comment.attachment && (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-xs text-gray-700">{formatAttachmentName(comment.attachment)}</span>
                          <button
                            type="button"
                            onClick={() => handleCommentAttachmentPreview(comment.attachment, idx)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(comment.attachment)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                        {previewedCommentIdx === idx && previewedCommentUrl && (
                          <div className="mt-2 p-2 border border-gray-200 rounded-lg">
                            {previewedCommentType === 'image' && (
                              <div className="text-center">
                                <img
                                  src={previewedCommentUrl}
                                  alt="Attachment"
                                  className="max-w-full h-auto rounded-lg border border-gray-200 mx-auto"
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                            {previewedCommentType === 'pdf' && (
                              <div className="text-center">
                                <iframe
                                  src={previewedCommentUrl}
                                  title="Attachment PDF"
                                  className="w-full h-64 border border-gray-200 rounded-lg"
                                />
                              </div>
                            )}
                            {previewedCommentType === 'unsupported' && (
                              <div className="text-center">
                                <p className="text-sm text-red-600 mb-2">
                                  This file type is not supported for preview.
                                </p>
                                <div className="w-24 h-24 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                                  <FileText size={24} className="text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Please download the file to view it.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No comments yet.</p>
            )}
          </div>

          {/* Action Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Priority Update
                </h4>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <select
                    value={prioritySelection}
                    onChange={(e) => setPrioritySelection(e.target.value)}
                    disabled={ticket.status === 'revoked' || priorityUpdating}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    <option value="">Select Priority</option>
                    <option value="low">Low</option>
                    <option value="normal">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    type="button"
                    onClick={handlePriorityUpdate}
                    disabled={ticket.status === 'revoked' || priorityUpdating || !prioritySelection}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      ticket.status === 'revoked' || priorityUpdating || !prioritySelection
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {priorityUpdating ? 'Updating...' : 'Update Priority'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Comment
                </h4>
                <form onSubmit={handleAddComment} className="space-y-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={4}
                    disabled={ticket.status === 'revoked' || statusUpdating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  />
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setCommentAttachment(e.target.files[0] || null)}
                        className="hidden"
                      />
                      Choose File
                    </label>
                    {commentAttachment && (
                      <span className="text-sm text-gray-500">{commentAttachment.name}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={ticket.status === 'revoked' || statusUpdating || !comment.trim()}
                    className={`w-full px-4 py-2 rounded-lg transition-colors ${
                      ticket.status === 'revoked' || statusUpdating || !comment.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                  >
                    {statusUpdating ? 'Adding...' : 'Add Comment'}
                  </button>
                </form>
              </div>

              <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> As an IT Departmental Admin, you can update ticket priority, add comments, and assign Network Engineers. Ticket status updates are managed by Network Engineers.
                </p>
              </div>

              {ticket.status === 'revoked' && (
                <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This ticket has been revoked. Priority updates and comments are disabled.
                  </p>
                </div>
              )}
            </div>
          </div>

          {isWatchOnlyDepartment && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Network Engineer</h3>
              <button
                type="button"
                onClick={() => setAssignOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                <UserPlus size={16} />
                Assign Manually
              </button>
              <p className="text-sm text-gray-500 mt-2">
                If no Network Engineer accepts this ticket, you can manually assign it here.
              </p>

              {assignOpen && (
                <div className="mt-4 space-y-3">
                  <select
                    value={selectedEngineerId}
                    onChange={(e) => setSelectedEngineerId(e.target.value)}
                    disabled={assignLoading || assignSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Network Engineer</option>
                    {filteredEngineers.map((engineer) => (
                      <option key={engineer._id} value={engineer._id}>
                        {engineer.name} ({engineer.email})
                      </option>
                    ))}
                  </select>
                  {!assignLoading && filteredEngineers.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No network engineers found for this building.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleAssignManually}
                    disabled={assignLoading || assignSubmitting || !selectedEngineerId}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      assignLoading || assignSubmitting || !selectedEngineerId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {assignSubmitting ? 'Assigning...' : 'Assign Ticket'}
                  </button>
                  {assignLoading && (
                    <p className="text-sm text-gray-500">Loading network engineers...</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketDetail; 
