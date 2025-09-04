# 📁 Step-by-Step Source Upload Guide

This guide provides detailed instructions for uploading existing presentations as controlled sources in the guardrailed model.

## 🎯 Overview

The guardrailed model ensures all presentations come from **approved sources only**. Here's exactly how to upload and manage your presentation sources.

## 📋 Prerequisites

- ✅ User account with access to the platform
- ✅ Presentation files in supported formats (.pptx, .ppt, .pdf)
- ✅ Files under 50MB each
- ✅ Admin approval (for non-admin users)

## 🚀 Step-by-Step Upload Process

### Step 1: Access the Upload Interface

1. **Login to the platform**
   - Go to your platform URL
   - Enter your credentials
   - Click "Login"

2. **Navigate to Source Management**
   - Look for "Sources" or "Manage Sources" in the main menu
   - Click to access the source management page

3. **Start Upload Process**
   - Click "Upload New Source" button
   - Or drag and drop files onto the upload area

### Step 2: Prepare Your Files

#### Supported File Types:
- **PowerPoint**: `.pptx` (recommended), `.ppt`
- **PDF**: `.pdf` (will be converted to slides)

#### File Requirements:
- **Size**: Maximum 50MB per file
- **Quality**: High-resolution images preferred
- **Content**: Professional, relevant presentations
- **Format**: Well-structured slides with clear text

#### Before Uploading:
1. **Review your files** for quality and relevance
2. **Compress large files** if needed (reduce image sizes)
3. **Organize by industry** or use case
4. **Prepare metadata** (title, description, tags)

### Step 3: Upload Files

#### Method 1: Drag & Drop
1. **Open the upload area** in your browser
2. **Select files** from your computer
3. **Drag files** onto the upload area
4. **Release** to start upload

#### Method 2: File Browser
1. **Click "Choose Files"** button
2. **Navigate** to your presentation files
3. **Select files** (hold Ctrl/Cmd for multiple)
4. **Click "Open"** to start upload

#### Method 3: Bulk Upload
1. **Click "Bulk Upload"** option
2. **Select multiple files** (up to 10 at once)
3. **Fill in common metadata** for all files
4. **Click "Upload All"**

### Step 4: Fill in Metadata

#### Required Information:
- **Title**: Descriptive name for the presentation
  - Example: "Q3 Sales Results - Technology Division"
  - Example: "Product Launch Presentation - Healthcare"

- **Industry**: Select from dropdown
  - Technology, Healthcare, Finance, Education, Retail, Manufacturing, Consulting, Other

- **Description**: Brief summary of content
  - Example: "Quarterly sales performance review with key metrics and insights"
  - Example: "Product launch presentation covering features, benefits, and market positioning"

#### Optional Information:
- **Author**: Original creator of the presentation
- **Tags**: Keywords for searching (comma-separated)
  - Example: "sales, quarterly, metrics, performance"
  - Example: "product, launch, features, benefits"

- **Use Cases**: What this presentation is typically used for
  - Example: "Sales pitches, Client meetings, Internal reviews"
  - Example: "Product demos, Training sessions, Executive briefings"

### Step 5: Submit for Approval

#### For Regular Users:
1. **Click "Upload Sources"** button
2. **Wait for confirmation** message
3. **Check status** in "My Uploads" section
4. **Wait for admin approval** (you'll get email notification)

#### For Admin Users:
1. **Click "Upload Sources"** button
2. **Immediately approve** your own uploads
3. **Or review later** in admin dashboard

### Step 6: Monitor Upload Status

#### Status Types:
- **🟡 Pending**: Awaiting admin approval
- **🔄 Processing**: AI is analyzing the content
- **🟢 Approved**: Ready for use in presentations
- **🔴 Rejected**: Not suitable for use
- **❌ Failed**: Processing failed

#### How to Check Status:
1. **Go to "My Uploads"** section
2. **View status** for each uploaded file
3. **Check email** for notifications
4. **Contact admin** if stuck in pending

## 🔧 Technical Details

### File Processing Pipeline

1. **Upload Validation**
   - Check file format and size
   - Verify file integrity
   - Store in secure location

2. **AI Analysis** (when approved)
   - Extract all slides from presentation
   - Analyze text content and images
   - Generate relevance scores
   - Index for search

3. **Quality Control**
   - Check for sufficient content
   - Verify image quality
   - Ensure professional appearance

4. **Approval Workflow**
   - Admin reviews content
   - Approves or rejects with feedback
   - Updates status accordingly

### API Endpoints Used

```typescript
// Upload files
POST /api/sources/upload
Content-Type: multipart/form-data

// Check upload status
GET /api/sources/upload/:uploadId/status

// Get approved sources
GET /api/sources/approved

// Get sources by industry
GET /api/sources/industry/:industry
```

## 📊 Source Management

### Admin Dashboard Features

Admins can:
- **View all uploads**: Pending, approved, rejected
- **Bulk operations**: Approve/reject multiple sources
- **Search & filter**: By industry, date, status, user
- **Analytics**: Usage statistics and performance metrics

### Source Organization

- **By Industry**: Group sources by business sector
- **By Use Case**: Sales, training, demos, etc.
- **By Quality**: High, medium, low relevance scores
- **By Date**: Recently uploaded vs. older sources

## 🎯 Best Practices

### For Uploaders

1. **Choose High-Quality Sources**
   - Professional, well-designed presentations
   - Clear, readable text and images
   - Relevant to your industry and use cases
   - Up-to-date information

2. **Provide Accurate Metadata**
   - Descriptive, specific titles
   - Correct industry classification
   - Relevant, searchable tags
   - Detailed, helpful descriptions

3. **Organize by Purpose**
   - Sales presentations
   - Training materials
   - Product demos
   - Executive summaries
   - Internal communications

### For Admins

1. **Regular Review Process**
   - Check pending uploads daily
   - Provide constructive feedback for rejections
   - Maintain consistent quality standards
   - Train users on requirements

2. **Source Curation**
   - Remove outdated sources
   - Promote high-quality content
   - Organize by use case and industry
   - Monitor usage patterns

## 🚨 Troubleshooting

### Common Upload Issues

#### File Too Large
```
Error: File size exceeds 50MB limit
```
**Solutions:**
- Compress images in PowerPoint
- Reduce file size using "Compress Pictures"
- Split large presentations into smaller parts
- Convert to PDF and re-upload

#### Unsupported Format
```
Error: File format not supported
```
**Solutions:**
- Convert to .pptx format
- Use PowerPoint to save as .pptx
- Try online conversion tools
- Contact support for other formats

#### Upload Failed
```
Error: Upload failed
```
**Solutions:**
- Check internet connection
- Try uploading one file at a time
- Clear browser cache
- Try different browser

#### Processing Failed
```
Error: AI processing failed
```
**Solutions:**
- Check file quality and content
- Ensure text is readable (not just images)
- Try re-uploading the file
- Contact admin for assistance

### Getting Help

1. **Check Upload Status**: View in "My Uploads" section
2. **Review Error Messages**: Look for specific error details
3. **Contact Admin**: For approval or technical issues
4. **Check Guidelines**: Ensure compliance with requirements

## 📈 Success Metrics

### Upload Success Indicators

- **Fast Processing**: Files processed within minutes
- **High Approval Rate**: Most uploads get approved
- **Good Quality Scores**: High relevance ratings
- **Frequent Usage**: Sources used in presentations

### Quality Indicators

- **Clear Metadata**: Descriptive titles and descriptions
- **Relevant Tags**: Helpful for searching
- **Professional Content**: High-quality presentations
- **Regular Updates**: Fresh, current information

## 🔒 Security and Compliance

### Data Protection

- **Encrypted Storage**: All files encrypted at rest
- **Secure Upload**: HTTPS only, no unsecured transfers
- **Access Control**: Role-based permissions
- **Audit Trail**: Complete activity logging

### Compliance Features

- **Source Tracking**: Know origin of every slide
- **Approval Workflow**: Quality control process
- **Usage Monitoring**: Track how sources are used
- **Data Retention**: Configurable retention policies

## 📞 Support and Resources

### Self-Service Resources

- **Upload Guide**: This document
- **FAQ Section**: Common questions and answers
- **Video Tutorials**: Step-by-step walkthroughs
- **Best Practices**: Tips for successful uploads

### Getting Help

- **Technical Issues**: Contact IT support
- **Upload Questions**: Ask your admin
- **Quality Standards**: Review guidelines
- **Feature Requests**: Submit feedback

---

**Ready to upload your first source? 🚀**

Follow these steps to start building your controlled presentation library and ensure all generated presentations come from approved, high-quality sources!
