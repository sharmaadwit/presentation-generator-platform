# 📁 Source Upload Guide

This guide explains how to upload existing presentations as controlled sources in the guardrailed model.

## 🎯 Overview

In the guardrailed model, all presentations must come from **approved sources only**. This ensures:
- ✅ Quality control over content
- ✅ Compliance with your organization's standards
- ✅ No random internet scraping
- ✅ Complete audit trail of all sources

## 📋 Upload Process

### Step 1: Access the Upload Interface

1. **Login to the platform**
2. **Navigate to "Manage Sources"** (Admin users only)
3. **Click "Upload New Source"**

### Step 2: Upload Presentation File

#### Supported File Types:
- **PowerPoint**: `.pptx`, `.ppt`
- **PDF**: `.pdf` (will be converted to slides)

#### File Requirements:
- **Maximum Size**: 50MB per file
- **Quality**: High-resolution images preferred
- **Content**: Must be relevant to your industry/use cases

#### Upload Methods:

**Method 1: Single File Upload**
1. Click "Choose File" or drag & drop
2. Select your presentation file
3. Fill in metadata (see Step 3)
4. Click "Upload"

**Method 2: Bulk Upload**
1. Click "Bulk Upload"
2. Select multiple files (max 10 at once)
3. Fill in common metadata
4. Click "Upload All"

### Step 3: Provide Source Metadata

#### Required Information:
- **Title**: Descriptive name for the presentation
- **Industry**: Select from dropdown (Technology, Healthcare, Finance, etc.)
- **Description**: Brief summary of the content
- **Tags**: Keywords for easy searching (comma-separated)

#### Optional Information:
- **Author**: Original creator
- **Date**: When it was created
- **Version**: If applicable
- **Department**: Which team created it
- **Use Cases**: What this presentation is typically used for

### Step 4: Admin Approval

#### For Regular Users:
1. Upload goes to **"Pending Approval"** status
2. Admin will review and approve/reject
3. You'll receive email notification of decision

#### For Admin Users:
1. Upload goes to **"Pending Approval"** status
2. You can immediately approve your own uploads
3. Or review and approve later

### Step 5: Source Processing

Once approved:
1. **AI Analysis**: System extracts all slides
2. **Content Indexing**: Text and images are analyzed
3. **Relevance Scoring**: AI scores content for different use cases
4. **Ready for Use**: Source becomes available for presentation generation

## 🔧 Technical Implementation

### Frontend Upload Component

The upload interface includes:

```typescript
// Upload form with drag & drop
<UploadManager>
  <FileUploader 
    accept=".pptx,.ppt,.pdf"
    maxSize="50MB"
    multiple={true}
  />
  <MetadataForm>
    <IndustrySelector />
    <TagInput />
    <DescriptionTextarea />
  </MetadataForm>
</UploadManager>
```

### Backend API Endpoints

```typescript
// Upload single presentation
POST /api/sources/upload
Content-Type: multipart/form-data

// Upload multiple presentations
POST /api/sources/upload/bulk
Content-Type: multipart/form-data

// Get upload status
GET /api/sources/upload/:uploadId/status

// Approve/reject source
PUT /api/sources/:sourceId/approve
```

### AI Processing Pipeline

```python
# 1. File validation and conversion
validate_file(file_path)
convert_to_pptx(file_path)  # if PDF

# 2. Slide extraction
extract_slides(presentation)

# 3. Content analysis
analyze_content(slides)

# 4. Indexing and storage
index_slides(slides, metadata)
```

## 📊 Source Management

### Admin Dashboard

Admins can:
- **View All Sources**: Approved, pending, and rejected
- **Bulk Operations**: Approve/reject multiple sources
- **Search & Filter**: By industry, date, status, etc.
- **Analytics**: Usage statistics for each source

### Source Status Types

- **🟡 Pending**: Awaiting admin approval
- **🟢 Approved**: Ready for use in presentations
- **🔴 Rejected**: Not suitable for use
- **🔄 Processing**: Being analyzed by AI
- **❌ Failed**: Processing failed

### Quality Control

#### Automatic Checks:
- **File Format**: Valid PowerPoint or PDF
- **File Size**: Within limits
- **Content Quality**: Sufficient text content
- **Image Quality**: Clear, readable images

#### Manual Review:
- **Relevance**: Does it fit your use cases?
- **Quality**: Is the content professional?
- **Compliance**: Meets your standards?
- **Uniqueness**: Not duplicate of existing source

## 🎯 Best Practices

### For Uploaders

1. **Choose High-Quality Sources**
   - Professional presentations
   - Clear, readable content
   - Good image quality
   - Relevant to your industry

2. **Provide Accurate Metadata**
   - Descriptive titles
   - Correct industry classification
   - Relevant tags
   - Detailed descriptions

3. **Organize by Use Case**
   - Sales presentations
   - Training materials
   - Product demos
   - Executive summaries

### For Admins

1. **Regular Review Process**
   - Check pending uploads daily
   - Provide feedback for rejections
   - Maintain quality standards

2. **Source Organization**
   - Group by industry
   - Tag by use case
   - Archive outdated sources

3. **User Training**
   - Educate users on quality standards
   - Provide examples of good sources
   - Regular feedback sessions

## 🔍 Search and Discovery

### Finding Sources

Users can search sources by:
- **Industry**: Technology, Healthcare, Finance, etc.
- **Use Case**: Sales, Training, Demo, etc.
- **Tags**: Keywords and topics
- **Date**: When uploaded
- **Author**: Who created it
- **Quality Score**: AI-calculated relevance

### Source Recommendations

The system will suggest sources based on:
- **User's Previous Uploads**: Similar content
- **Industry Trends**: Popular in your field
- **Use Case Patterns**: What works well
- **Quality Scores**: High-performing sources

## 📈 Analytics and Insights

### Source Performance Metrics

- **Usage Count**: How often used in presentations
- **Relevance Score**: AI-calculated quality
- **User Feedback**: Ratings and comments
- **Generation Success**: How well it works

### Popular Sources

- **Most Used**: Sources used most frequently
- **Highest Rated**: Best user feedback
- **Industry Leaders**: Top sources by industry
- **Trending**: Recently popular sources

## 🚨 Troubleshooting

### Common Upload Issues

#### File Too Large
```
Error: File size exceeds 50MB limit
```
**Solution**: Compress images or split presentation

#### Unsupported Format
```
Error: File format not supported
```
**Solution**: Convert to .pptx or .ppt format

#### Upload Failed
```
Error: Upload failed
```
**Solution**: Check internet connection, try again

#### Processing Failed
```
Error: AI processing failed
```
**Solution**: Check file quality, contact admin

### Getting Help

1. **Check Upload Status**: View in "My Uploads"
2. **Contact Admin**: For approval issues
3. **Review Guidelines**: Ensure compliance
4. **Try Different File**: If processing fails

## 🔒 Security and Compliance

### Data Protection

- **Encrypted Storage**: All files encrypted at rest
- **Secure Upload**: HTTPS only
- **Access Control**: Role-based permissions
- **Audit Trail**: Complete activity logging

### Compliance Features

- **Source Tracking**: Know where every slide came from
- **Approval Workflow**: Quality control process
- **Usage Monitoring**: Track how sources are used
- **Data Retention**: Configurable retention policies

## 📞 Support

### For Users
- **Upload Help**: Check this guide
- **Technical Issues**: Contact IT support
- **Quality Questions**: Ask your admin

### For Admins
- **Bulk Operations**: Use admin dashboard
- **User Management**: Manage permissions
- **System Configuration**: Adjust settings

---

**Ready to upload your first source? 🚀**

Follow these steps to start building your controlled presentation library!
