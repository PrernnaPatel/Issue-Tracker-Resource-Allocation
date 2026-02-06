import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, User, Calendar, Clock, Building2, Mail, Phone, MapPin, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { getDepartmentTickets, getDepartmentAttachment, updateTicketStatus, markTicketAsViewed } from '../../service/deptAuthService';
import { useDeptAuth, getIdFromToken } from '../../context/DeptAuthContext';
import { useNotifications } from '../../context/NotificationContext';

const TicketDetail = () => {
  const { ticketId } = useParams();
  const { token } = useDeptAuth();
  const { refreshUnreadTickets } = useNotifications();
  const adminId = getIdFromToken(token);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [attachmentType, setAttachmentType] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [previewedCommentIdx, setPreviewedCommentIdx] = useState(null);
  const [previewedCommentUrl, setPreviewedCommentUrl] = useState(null);
  const [previewedCommentType, setPreviewedCommentType] = useState(null);

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
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      case 'in_progress':
        return { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' };
      case 'resolved':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'revoked':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
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

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatus) return toast.error('Please select a status');
    setStatusUpdating(true);
    const result = await updateTicketStatus(ticket._id, { status: newStatus });
    setStatusUpdating(false);
    if (result.success) {
      setTicket(result.ticket);
      toast.success('Status updated successfully');
      setNewStatus('');
    } else {
      toast.error(result.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() && !commentAttachment) return toast.error('Comment or attachment required');
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

            {/* Ticket Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
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
                      {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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

          {/* Action Buttons */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="flex flex-col md:flex-row flex-wrap gap-4">
              {/* Status Update Form */}
              {ticket.status !== 'resolved' && ticket.status !== 'revoked' && (
                <>
                  {/* Restrict status change for in_progress tickets to only if assigned_to matches adminId from token */}
                  {ticket.status === 'in_progress' && adminId && (String(ticket.assigned_to) !== String(adminId)) ? (
                    <div className="flex flex-col gap-2">
                      <select
                        disabled
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
                      >
                        <option value="">Select status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-300 text-gray-500 cursor-not-allowed"
                      >
                        Update Status
                      </button>
                      <span className="text-sm text-red-500 mt-1">
                        Only the assigned admin can change the status of this ticket while it is in progress.
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleStatusUpdate} className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        disabled={statusUpdating}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="">Select status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <button
                        type="submit"
                        disabled={statusUpdating || !newStatus}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          statusUpdating || !newStatus
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {statusUpdating ? 'Updating...' : 'Update Status'}
                      </button>
                    </form>
                  )}
                </>
              )}
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  disabled={ticket.status === 'revoked' || statusUpdating}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setCommentAttachment(e.target.files[0] || null)}
                  className="block text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 mt-2"
                />
                <button
                  type="submit"
                  disabled={ticket.status === 'revoked' || statusUpdating || !comment.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    ticket.status === 'revoked' || statusUpdating || !comment.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  {statusUpdating ? 'Adding...' : 'Add Comment'}
                </button>
              </form>
              {ticket.status === 'revoked' && (
                <div className="w-full mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This ticket has been revoked. Status updates and comments are disabled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail; 