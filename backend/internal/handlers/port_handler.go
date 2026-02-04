package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/gofiber/fiber/v2"
)

type PortHandler struct {
    repo *repository.PortRepository
    importerService *services.ImporterService
}

func NewPortHandler(repo *repository.PortRepository, importerService *services.ImporterService) *PortHandler {
    return &PortHandler{
        repo:            repo,
        importerService: importerService,  
    }
}

func (h *PortHandler) GetAllPorts(c *fiber.Ctx) error {
    ports, err := h.repo.GetAll(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(ports)
}

// GetPortStats handles GET /api/ports/stats
func (h *PortHandler) GetPortStats(c *fiber.Ctx) error {
    stats, err := h.repo.GetPortStats(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch port statistics",
        })
    }

    return c.JSON(fiber.Map{
        "total_ports": len(stats),
        "ports":       stats,
    })
}

// CreatePort creates a new port
func (h *PortHandler) CreatePort(c *gin.Context) {
    var port models.Port
    if err := c.ShouldBindJSON(&port); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Set default type if not provided
    if port.Type == "" {
        port.Type = "COMMERCIAL"
    }

    if err := h.repo.Create(c.Request.Context(), &port); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, port)
}

// ✅ NEW: UpdatePort updates an existing port
func (h *PortHandler) UpdatePort(c *gin.Context) {
    id := c.Param("id")

    // Check if port exists
    existingPort, err := h.repo.GetByID(c.Request.Context(), id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Port not found"})
        return
    }

    var port models.Port
    if err := c.ShouldBindJSON(&port); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Keep the same ID and created_at
    port.ID = existingPort.ID
    port.CreatedAt = existingPort.CreatedAt

    if err := h.repo.Update(c.Request.Context(), &port); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, port)
}

// ✅ NEW: DeletePort removes a port
func (h *PortHandler) DeletePort(c *gin.Context) {
    id := c.Param("id")

    if err := h.repo.Delete(c.Request.Context(), id); err != nil {
        c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Port deleted successfully"})
}

// ✅ NEW: UploadPortsCSV handles CSV file upload for bulk port import
func (h *PortHandler) UploadPortsCSV(c *gin.Context) {
    // Get the uploaded file
    file, header, err := c.Request.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
        return
    }
    defer file.Close()

    // Validate file type
    contentType := header.Header.Get("Content-Type")
    if contentType != "text/csv" && contentType != "application/vnd.ms-excel" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File must be a CSV"})
        return
    }

    // Import ports using the service
    count, err := h.importerService.ImportPorts(c.Request.Context(), file)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Import failed: %s", err.Error())})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Ports imported successfully",
        "count":   count,
    })
}

// ✅ NEW: DownloadPortsTemplate generates a CSV template for ports
func (h *PortHandler) DownloadPortsTemplate(c *gin.Context) {
    c.Header("Content-Type", "text/csv")
    c.Header("Content-Disposition", "attachment; filename=ports_template.csv")

    writer := csv.NewWriter(c.Writer)
    defer writer.Flush()

    // Write headers
    headers := []string{"name", "locode", "country", "type", "latitude", "longitude"}
    writer.Write(headers)

    // Write example row
    example := []string{"Port of Rotterdam", "NLRTM", "Netherlands", "COMMERCIAL", "51.9225", "4.47917"}
    writer.Write(example)
}