package services

import (
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/johnfercher/maroto/pkg/color"
	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
)

type PDFService struct{}

func NewPDFService() *PDFService {
	return &PDFService{}
}

// GenerateBillOfLading creates a PDF byte array
func (s *PDFService) GenerateBillOfLading(shipment *models.Shipment, vesselName string) ([]byte, error) {
	m := pdf.NewMaroto(consts.Portrait, consts.A4)

	// 1. HEADER (Company Branding)
	m.RegisterHeader(func() {
		m.Row(20, func() {
			m.Col(12, func() {
				m.Text("NEPTUNE SHIPMENTS GLOBAL", props.Text{
					Top:   5,
					Style: consts.Bold,
					Size:  20,
					Align: consts.Center,
					Color: getDarkBlue(), 
				})
				m.Text("Official Bill of Lading", props.Text{
					Top:   12,
					Size:  10,
					Align: consts.Center,
					Style: consts.Italic,
				})
			})
		})
	})

	// 2. SHIPMENT DETAILS (Grid)
	m.Row(10, func() {
		m.Col(12, func() {
			m.Text("TRACKING NUMBER: "+shipment.TrackingNumber, props.Text{Style: consts.Bold})
		})
	})

	m.Line(1.0)

	// Info Grid
	m.Row(40, func() {
		// Left Column: Shipper Info
		m.Col(6, func() {
			m.Text("SHIPPER / EXPORTER:", props.Text{Top: 2, Style: consts.Bold})
			m.Text(shipment.CustomerName, props.Text{Top: 8})
			m.Text("Neptune Logistics HQ", props.Text{Top: 14})
			m.Text("123 Ocean Drive, Atlantis", props.Text{Top: 20})
		})
		// Right Column: Booking Info
		m.Col(6, func() {
			m.Text("BOOKING DATE:", props.Text{Top: 2, Style: consts.Bold})
			m.Text(shipment.CreatedAt.Format("2006-01-02"), props.Text{Top: 8})
			
			m.Text("VESSEL:", props.Text{Top: 16, Style: consts.Bold})
			m.Text(vesselName, props.Text{Top: 22})
		})
	})

	m.Line(1.0)

	// 3. ROUTE INFO
	m.Row(30, func() {
		m.Col(6, func() {
			m.Text("PORT OF LOADING", props.Text{Style: consts.Bold})
			m.Text(shipment.OriginPortName, props.Text{Top: 6, Size: 12})
		})
		m.Col(6, func() {
			m.Text("PORT OF DISCHARGE", props.Text{Style: consts.Bold})
			m.Text(shipment.DestinationPortName, props.Text{Top: 6, Size: 12})
		})
	})

	// 4. CARGO TABLE
	header := []string{"Container #", "Description", "Weight (KG)", "Status"}
	contents := [][]string{
		{
			shipment.ContainerNumber,
			shipment.Description,
			fmt.Sprintf("%.2f kg", shipment.WeightKG),
			shipment.Status,
		},
	}

	m.TableList(header, contents, props.TableList{
		HeaderProp: props.TableListContent{
			Size:      10,
			GridSizes: []uint{3, 5, 2, 2},
			Style:     consts.Bold,
		},
		ContentProp: props.TableListContent{
			Size:      10,
			GridSizes: []uint{3, 5, 2, 2},
		},
	})

	m.Row(20, func() {}) 

	// 5. QR CODE & SIGNATURE
	m.Row(40, func() {
		m.Col(3, func() {
			m.QrCode("http://localhost:5173/track?id="+shipment.TrackingNumber)
		})
		m.Col(9, func() {
			m.Text("CARRIER SIGNATURE", props.Text{Top: 25, Style: consts.Bold, Align: consts.Right})
			m.Text("Neptune Automated Systems", props.Text{Top: 32, Style: consts.Italic, Align: consts.Right})
		})
	})

    // Fix: Convert Buffer to Bytes using .Bytes()
	buffer, err := m.Output()
    if err != nil {
        return nil, err
    }
    return buffer.Bytes(), nil
}

// Fix: Return a Color Struct, not 3 integers
func getDarkBlue() color.Color {
	return color.Color{
        Red:   10,
        Green: 20,
        Blue:  50,
    }
}