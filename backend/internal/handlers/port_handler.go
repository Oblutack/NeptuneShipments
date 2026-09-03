package handlers

import (
    "context"
    "encoding/csv"
    "fmt"

    "github.com/Oblutack/NeptuneShipments/backend/internal/models"
    "github.com/Oblutack/NeptuneShipments/backend/internal/repository"
    "github.com/Oblutack/NeptuneShipments/backend/internal/services"
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
    ctx := context.Background()

    ports, err := h.repo.GetAll(ctx)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch ports",
        })
    }

    // ✅ FIX: Return empty array instead of null if no ports
    if ports == nil {
        ports = []models.Port{}
    }

    // ✅ FIX: Return array directly, not wrapped in object
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
func (h *PortHandler) CreatePort(c *fiber.Ctx) error {
    var port models.Port
    if err := c.BodyParser(&port); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Set default type if not provided
    if port.Type == "" {
        port.Type = "COMMERCIAL"
    }

    if err := h.repo.Create(c.Context(), &port); err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(fiber.StatusCreated).JSON(port)
}

// UpdatePort updates an existing port
func (h *PortHandler) UpdatePort(c *fiber.Ctx) error {
    id := c.Params("id")

    // Check if port exists
    existingPort, err := h.repo.GetByID(c.Context(), id)
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Port not found"})
    }

    var port models.Port
    if err := c.BodyParser(&port); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // Keep the same ID and created_at
    port.ID = existingPort.ID
    port.CreatedAt = existingPort.CreatedAt

    if err := h.repo.Update(c.Context(), &port); err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(port)
}

// DeletePort removes a port
func (h *PortHandler) DeletePort(c *fiber.Ctx) error {
    id := c.Params("id")

    if err := h.repo.Delete(c.Context(), id); err != nil {
        return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"message": "Port deleted successfully"})
}

// UploadPortsCSV handles CSV file upload for bulk port import
func (h *PortHandler) UploadPortsCSV(c *fiber.Ctx) error {
    file, err := c.FormFile("file")
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
    }

    src, err := file.Open()
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open file"})
    }
    defer src.Close()

    count, err := h.importerService.ImportPorts(c.Context(), src)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Import failed: %s", err.Error())})
    }

    return c.JSON(fiber.Map{
        "message": "Ports imported successfully",
        "count":   count,
    })
}

// DownloadPortsTemplate generates a CSV template for ports
func (h *PortHandler) DownloadPortsTemplate(c *fiber.Ctx) error {
    c.Set("Content-Type", "text/csv")
    c.Set("Content-Disposition", "attachment; filename=ports_template.csv")

    writer := csv.NewWriter(c.Response().BodyWriter())
    defer writer.Flush()

    headers := []string{"name", "locode", "country", "type", "latitude", "longitude"}
    writer.Write(headers)

    example := []string{"Port of Rotterdam", "NLRTM", "Netherlands", "COMMERCIAL", "51.9225", "4.47917"}
    writer.Write(example)

    return nil
}
